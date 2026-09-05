import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import logger from '../config/logger';
import { mlModerationService, ModerationResult } from '../services/mlModerationService';
import { AutomatedActionEngine } from '../services/automatedActionEngine';

interface ActiveSession {
  sessionId: string;
  user1Id: string;
  user2Id: string;
  analysisInterval: NodeJS.Timeout | null;
  lastAnalysis: Map<string, Date>;
  violationCount: Map<string, number>;
}

class RealTimeModerationMiddleware {
  private io: Server | null = null;
  private activeSessions = new Map<string, ActiveSession>();
  private userSockets = new Map<string, Socket>();
  private analysisIntervalMs = 5000;
  private maxViolationsBeforeAction = 3;

  initialize(io: Server) {
    this.io = io;
    logger.info('Real-time moderation middleware initialized');
  }

  registerSocket(userId: string, socket: Socket) {
    this.userSockets.set(userId, socket);
  }

  unregisterSocket(userId: string) {
    this.userSockets.delete(userId);
  }

  startSessionMonitoring(sessionId: string, user1Id: string, user2Id: string) {
    if (this.activeSessions.has(sessionId)) {
      return;
    }

    const session: ActiveSession = {
      sessionId,
      user1Id,
      user2Id,
      analysisInterval: null,
      lastAnalysis: new Map(),
      violationCount: new Map(),
    };

    this.activeSessions.set(sessionId, session);

    session.analysisInterval = setInterval(async () => {
      await this.analyzeSession(session);
    }, this.analysisIntervalMs);

    logger.info(`Started real-time monitoring for session ${sessionId}`);
  }

  stopSessionMonitoring(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      if (session.analysisInterval) {
        clearInterval(session.analysisInterval);
      }
      this.activeSessions.delete(sessionId);
      logger.info(`Stopped real-time monitoring for session ${sessionId}`);
    }
  }

  private async analyzeSession(session: ActiveSession) {
    try {
      const sessionData = await prisma.videoSession.findUnique({
        where: { id: session.sessionId },
        select: { status: true, user1Id: true, user2Id: true },
      });

      if (!sessionData || sessionData.status === 'ended') {
        this.stopSessionMonitoring(session.sessionId);
        return;
      }

      await this.analyzeUserFrame(session, session.user1Id);
      await this.analyzeUserFrame(session, session.user2Id);
    } catch (error) {
      logger.error(`Error analyzing session ${session.sessionId}:`, error);
    }
  }

  private async analyzeUserFrame(session: ActiveSession, userId: string) {
    const lastAnalysis = session.lastAnalysis.get(userId);
    const now = new Date();

    if (lastAnalysis) {
      const timeSinceLastAnalysis = now.getTime() - lastAnalysis.getTime();
      if (timeSinceLastAnalysis < this.analysisIntervalMs) {
        return;
      }
    }

    session.lastAnalysis.set(userId, now);

    if (!this.io) return;

    const frameData = await this.requestFrameFromClient(userId, session.sessionId);

    if (!frameData) {
      return;
    }

    const result = await mlModerationService.analyzeFrame(frameData, userId, session.sessionId);

    await this.handleModerationResult(session, userId, result);
  }

  private async requestFrameFromClient(userId: string, sessionId: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const socket = this.userSockets.get(userId);
      if (!socket || !this.io) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        socket.off('moderation_frame_response', handler);
        resolve(null);
      }, 3000);

      this.io.to(userId).emit('moderation_request_frame', { sessionId });

      const handler = (data: { sessionId: string; frameData: string }) => {
        if (data.sessionId === sessionId) {
          clearTimeout(timeout);
          socket.off('moderation_frame_response', handler);

          try {
            const buffer = Buffer.from(data.frameData, 'base64');
            resolve(buffer);
          } catch {
            resolve(null);
          }
        }
      };

      socket.on('moderation_frame_response', handler);
    });
  }

  private async handleModerationResult(
    session: ActiveSession,
    userId: string,
    result: ModerationResult
  ) {
    if (!this.io) return;

    const currentViolations = session.violationCount.get(userId) || 0;

    if (result.shouldTerminate) {
      await this.terminateSession(session, userId, result);
      return;
    }

    if (result.violatedCategory) {
      const newViolationCount = currentViolations + 1;
      session.violationCount.set(userId, newViolationCount);

      this.io.to(userId).emit('moderation_warning', {
        sessionId: session.sessionId,
        violation: result.violatedCategory,
        confidence: result.confidence,
        warningCount: newViolationCount,
        maxWarnings: this.maxViolationsBeforeAction,
      });

      if (newViolationCount >= this.maxViolationsBeforeAction) {
        await this.terminateSession(session, userId, result);
        return;
      }

      await this.logModerationEvent(session, userId, result);
    } else {
      session.violationCount.set(userId, 0);
    }
  }

  private async terminateSession(
    session: ActiveSession,
    userId: string,
    result: ModerationResult
  ) {
    if (!this.io) return;

    try {
      await prisma.videoSession.update({
        where: { id: session.sessionId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          flaggedContent: true,
          moderationScore: result.maxViolationScore,
        },
      });

      this.io.to(session.user1Id).emit('session_terminated_by_moderation', {
        sessionId: session.sessionId,
        reason: result.violatedCategory || 'policy_violation',
        terminatedUser: userId,
      });

      this.io.to(session.user2Id).emit('session_terminated_by_moderation', {
        sessionId: session.sessionId,
        reason: result.violatedCategory || 'policy_violation',
        terminatedUser: userId,
      });

      await AutomatedActionEngine.handleMLViolation(
        userId,
        session.sessionId,
        result.violatedCategory || 'policy_violation',
        result.maxViolationScore
      );

      this.stopSessionMonitoring(session.sessionId);

      logger.info(`Session ${session.sessionId} terminated by ML moderation: ${result.violatedCategory}`);
    } catch (error) {
      logger.error(`Error terminating session ${session.sessionId}:`, error);
    }
  }

  private async logModerationEvent(
    session: ActiveSession,
    userId: string,
    result: ModerationResult
  ) {
    try {
      await prisma.moderationLog.create({
        data: {
          userId,
          action: 'ml_flag',
          details: {
            sessionId: session.sessionId,
            violation: result.violatedCategory,
            confidence: result.maxViolationScore,
            predictions: result.predictions,
          },
        },
      });
    } catch (error) {
      logger.error('Error logging moderation event:', error);
    }
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getSessionStats(): { active: number; totalViolations: number } {
    let totalViolations = 0;
    this.activeSessions.forEach((session) => {
      session.violationCount.forEach((count) => {
        totalViolations += count;
      });
    });

    return {
      active: this.activeSessions.size,
      totalViolations,
    };
  }
}

export const realTimeModeration = new RealTimeModerationMiddleware();
