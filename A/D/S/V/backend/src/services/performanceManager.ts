import { PrismaClient } from '@prisma/client';
import { getCache } from './cacheService';
import { getQueryOptimizer, createPrismaClient } from './queryOptimizer';

export class PerformanceManager {
  public prisma: PrismaClient;
  public query: ReturnType<typeof getQueryOptimizer>;
  private cache: ReturnType<typeof getCache>;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.prisma = createPrismaClient();
    this.query = getQueryOptimizer(this.prisma);
    this.cache = getCache();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        await this.cache.connect();
        await this.prisma.$connect();
        this.initialized = true;
        console.log('[PerformanceManager] Initialized: Cache connected, DB connected');
      } catch (error: any) {
        console.error('[PerformanceManager] Initialization failed:', error.message);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async shutdown(): Promise<void> {
    try {
      await this.cache.close();
      await this.prisma.$disconnect();
      this.initialized = false;
      console.log('[PerformanceManager] Shutdown complete');
    } catch (error: any) {
      console.error('[PerformanceManager] Shutdown error:', error.message);
    }
  }

  async invalidateUserData(userId: string): Promise<void> {
    await Promise.all([
      this.query.invalidateUserCache(userId),
      this.cache.delPattern(`match:user:${userId}:*`),
      this.cache.del(`session:${userId}:*`),
    ]);
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded';
    database: boolean;
    cache: boolean;
    uptime: number;
  }> {
    const checks = {
      database: false,
      cache: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {}

    try {
      await this.cache.exists('health-check');
      checks.cache = true;
    } catch {}

    const status = checks.database && checks.cache ? 'healthy' : 'degraded';

    return {
      status,
      ...checks,
      uptime: process.uptime(),
    };
  }
}

let performanceManager: PerformanceManager | null = null;

export function getPerformanceManager(): PerformanceManager {
  if (!performanceManager) {
    performanceManager = new PerformanceManager();
  }
  return performanceManager;
}
