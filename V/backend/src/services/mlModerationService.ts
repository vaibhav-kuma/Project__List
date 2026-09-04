import logger from '../config/logger';

let tf: any = null;
try {
  // @ts-ignore
  tf = require('@tensorflow/tfjs-node');
} catch {
  logger.warn('@tensorflow/tfjs-node not available. ML moderation will use fallback.');
}

export interface ModerationResult {
  sessionId?: string;
  userId?: string;
  timestamp: Date;
  frameData?: string;
  predictions: {
    nudity: number;
    violence: number;
    explicit: number;
    suggestive: number;
  };
  maxViolationScore: number;
  violatedCategory: string | null;
  shouldTerminate: boolean;
  confidence: number;
}

export interface ModerationThresholds {
  nudity: number;
  violence: number;
  explicit: number;
  suggestive: number;
  terminateThreshold: number;
  warnThreshold: number;
}

const DEFAULT_THRESHOLDS: ModerationThresholds = {
  nudity: 0.85,
  violence: 0.80,
  explicit: 0.90,
  suggestive: 0.75,
  terminateThreshold: 0.95,
  warnThreshold: 0.70,
};

class MLModerationService {
  private nudityModel: any = null;
  private violenceModel: any = null;
  private ageEstimationModel: any = null;
  private initialized = false;
  private thresholds: ModerationThresholds;
  private analysisCount = 0;
  private violationCache = new Map<string, { count: number; lastViolation: Date }>();

  constructor(thresholds?: Partial<ModerationThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!tf) {
      this.initialized = true;
      logger.info('ML moderation running in fallback mode (tfjs-node unavailable)');
      return;
    }

    try {
      logger.info('Initializing ML moderation models...');
      this.nudityModel = await this.loadModel('nudity');
      this.violenceModel = await this.loadModel('violence');
      this.ageEstimationModel = await this.loadModel('age-estimation');
      this.initialized = true;
      logger.info('ML moderation models initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ML models:', error);
      throw error;
    }
  }

  private async loadModel(type: string): Promise<any> {
    const modelPath = process.env[`ML_MODEL_PATH_${type.toUpperCase().replace('-', '_')}`];
    if (!tf) return null;

    if (modelPath) {
      try {
        return await tf.loadLayersModel(`file://${modelPath}`);
      } catch {
        logger.warn(`Model not found at ${modelPath}, using fallback`);
      }
    }

    return this.createFallbackModel(type);
  }

  private createFallbackModel(type: string): any {
    if (!tf) return null;
    const model = tf.sequential();
    const inputShape: [number, number, number] = [224, 224, 3];

    model.add(tf.layers.conv2d({ inputShape, filters: 32, kernelSize: 3, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: type === 'age-estimation' ? 'linear' : 'sigmoid' }));

    return model;
  }

  async analyzeFrame(frameBuffer: Buffer | any, userId?: string, sessionId?: string): Promise<ModerationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!tf) {
        this.analysisCount++;
        return this.fallbackResult(userId, sessionId);
      }

      const tensor = Buffer.isBuffer(frameBuffer) ? this.bufferToTensor(frameBuffer) : frameBuffer;
      const predictions = await this.runPredictions(tensor);
      const maxViolationScore = Math.max(predictions.nudity, predictions.violence, predictions.explicit, predictions.suggestive);
      const violatedCategory = this.getViolatedCategory(predictions);
      const shouldTerminate = maxViolationScore >= this.thresholds.terminateThreshold;
      const result: ModerationResult = {
        sessionId, userId, timestamp: new Date(), predictions,
        maxViolationScore, violatedCategory, shouldTerminate, confidence: maxViolationScore,
      };

      this.analysisCount++;
      if (shouldTerminate || violatedCategory) this.trackViolation(userId || 'unknown');

      if (this.analysisCount % 100 === 0) {
        logger.info(`Moderation stats: ${this.analysisCount} frames analyzed, ${this.violationCache.size} users with violations`);
      }

      return result;
    } catch (error) {
      logger.error('Frame analysis error:', error);
      return this.fallbackResult(userId, sessionId);
    }
  }

  private fallbackResult(userId?: string, sessionId?: string): ModerationResult {
    return {
      sessionId, userId, timestamp: new Date(),
      predictions: { nudity: 0, violence: 0, explicit: 0, suggestive: 0 },
      maxViolationScore: 0, violatedCategory: null, shouldTerminate: false, confidence: 0,
    };
  }

  private bufferToTensor(buffer: Buffer): any {
    if (!tf) return null;
    const uint8Array = new Uint8Array(buffer);
    const tensor = tf.tensor4d(uint8Array, [1, 224, 224, 3], 'float32');
    return tensor.div(255.0);
  }

  private async runPredictions(tensor: any): Promise<{ nudity: number; violence: number; explicit: number; suggestive: number }> {
    if (!tf) return { nudity: 0, violence: 0, explicit: 0, suggestive: 0 };

    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    let nudity = 0, violence = 0;

    if (this.nudityModel) {
      const pred = this.nudityModel.predict(resized);
      nudity = (await pred.data())[0];
      pred.dispose();
    }
    if (this.violenceModel) {
      const pred = this.violenceModel.predict(resized);
      violence = (await pred.data())[0];
      pred.dispose();
    }

    return { nudity, violence, explicit: nudity * 0.8, suggestive: nudity * 0.5 + violence * 0.2 };
  }

  private getViolatedCategory(predictions: { nudity: number; violence: number; explicit: number; suggestive: number }): string | null {
    for (const { name, score, threshold } of [
      { name: 'nudity', score: predictions.nudity, threshold: this.thresholds.nudity },
      { name: 'violence', score: predictions.violence, threshold: this.thresholds.violence },
      { name: 'explicit', score: predictions.explicit, threshold: this.thresholds.explicit },
      { name: 'suggestive', score: predictions.suggestive, threshold: this.thresholds.suggestive },
    ]) {
      if (score >= threshold) return name;
    }
    return null;
  }

  private trackViolation(userId: string): void {
    const now = new Date();
    const existing = this.violationCache.get(userId);
    if (existing && now.getTime() - existing.lastViolation.getTime() < 300000) {
      existing.count++;
      existing.lastViolation = now;
    } else {
      this.violationCache.set(userId, { count: 1, lastViolation: now });
    }
    setTimeout(() => this.violationCache.delete(userId), 600000);
  }

  getViolationCount(userId: string): number { return this.violationCache.get(userId)?.count || 0; }
  shouldAutoBan(userId: string): boolean { return this.getViolationCount(userId) >= 5; }
  getStats(): { analysisCount: number; activeViolators: number } {
    return { analysisCount: this.analysisCount, activeViolators: this.violationCache.size };
  }
  updateThresholds(thresholds: Partial<ModerationThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Moderation thresholds updated:', this.thresholds);
  }

  async estimateAge(frameBuffer: Buffer | any): Promise<number> {
    if (!this.ageEstimationModel || !tf) throw new Error('Age estimation not available');
    const tensor = Buffer.isBuffer(frameBuffer) ? this.bufferToTensor(frameBuffer) : frameBuffer;
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    const agePred = this.ageEstimationModel.predict(resized);
    const ageValue = await agePred.data();
    return Math.max(0, Math.min(100, ageValue[0] * 100));
  }

  async dispose(): Promise<void> {
    if (this.nudityModel) this.nudityModel.dispose();
    if (this.violenceModel) this.violenceModel.dispose();
    if (this.ageEstimationModel) this.ageEstimationModel.dispose();
    if (tf) tf.disposeVariables();
    logger.info('ML moderation models disposed');
  }
}

export const mlModerationService = new MLModerationService();
