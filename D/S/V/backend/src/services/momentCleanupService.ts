import prisma from '../config/database';
import { UploadService } from '../services/uploadService';
import logger from '../config/logger';

const BATCH_SIZE = 100;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

export class MomentCleanupService {
  private uploadService: UploadService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.uploadService = new UploadService();
  }

  start(): void {
    logger.info('Moment cleanup service started');

    this.runCleanup();

    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, CLEANUP_INTERVAL);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Moment cleanup service stopped');
  }

  async runCleanup(): Promise<{ expired: number; deleted: number; errors: number }> {
    const result = { expired: 0, deleted: 0, errors: 0 };

    try {
      const expiredMoments = await this.getExpiredMoments();
      result.expired = expiredMoments.length;

      if (expiredMoments.length === 0) {
        logger.debug('No expired moments to clean up');
        return result;
      }

      logger.info(`Found ${expiredMoments.length} expired moments to clean up`);

      for (let i = 0; i < expiredMoments.length; i += BATCH_SIZE) {
        const batch = expiredMoments.slice(i, i + BATCH_SIZE);
        const batchResult = await this.processBatch(batch);
        result.deleted += batchResult.deleted;
        result.errors += batchResult.errors;
      }

      logger.info(`Cleanup complete: ${result.deleted} deleted, ${result.errors} errors`);
    } catch (error) {
      logger.error('Cleanup service error:', error);
      result.errors++;
    }

    return result;
  }

  private async getExpiredMoments(): Promise<Array<{ id: string; mediaPublicId: string }>> {
    return prisma.moment.findMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isExpired: true },
        ],
      },
      select: {
        id: true,
        mediaPublicId: true,
      },
      take: 1000,
    });
  }

  private async processBatch(
    moments: Array<{ id: string; mediaPublicId: string }>
  ): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;

    const keysToDelete = moments.map((m) => m.mediaPublicId);

    try {
      await this.uploadService.cleanupExpiredFiles(keysToDelete);
    } catch (error) {
      logger.error('Failed to delete S3 files:', error);
      errors += moments.length;
      return { deleted: 0, errors };
    }

    for (const moment of moments) {
      try {
        await prisma.moment.delete({
          where: { id: moment.id },
        });
        deleted++;
      } catch (error) {
        logger.error(`Failed to delete moment ${moment.id}:`, error);
        errors++;
      }
    }

    return { deleted, errors };
  }

  async markExpiredMoments(): Promise<number> {
    const result = await prisma.moment.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isExpired: false,
      },
      data: {
        isExpired: true,
      },
    });

    if (result.count > 0) {
      logger.info(`Marked ${result.count} moments as expired`);
    }

    return result.count;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
  }> {
    const [total, active, expired, expiringSoon] = await Promise.all([
      prisma.moment.count(),
      prisma.moment.count({
        where: { isExpired: false, expiresAt: { gt: new Date() } },
      }),
      prisma.moment.count({
        where: { isExpired: true },
      }),
      prisma.moment.count({
        where: {
          isExpired: false,
          expiresAt: { gt: new Date(), lt: new Date(Date.now() + 60 * 60 * 1000) },
        },
      }),
    ]);

    return { total, active, expired, expiringSoon };
  }

  async cleanupOldViews(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.momentView.deleteMany({
      where: {
        viewedAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old moment views`);
    }

    return result.count;
  }

  async cleanupOldReplies(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.momentReply.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old moment replies`);
    }

    return result.count;
  }

  async runFullCleanup(): Promise<{
    expiredMarked: number;
    momentsDeleted: number;
    viewsCleaned: number;
    repliesCleaned: number;
  }> {
    const expiredMarked = await this.markExpiredMoments();
    const { deleted: momentsDeleted } = await this.processBatch(
      await this.getExpiredMoments()
    );
    const viewsCleaned = await this.cleanupOldViews();
    const repliesCleaned = await this.cleanupOldReplies();

    return { expiredMarked, momentsDeleted, viewsCleaned, repliesCleaned };
  }
}

export const momentCleanupService = new MomentCleanupService();
