import prisma from '../config/database';
import logger from '../config/logger';
import { emailService } from './emailService';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface DataExportRequest {
  userId: string;
  format?: 'json' | 'csv';
  includeMessages?: boolean;
  includeMoments?: boolean;
  includeFriends?: boolean;
  includeReports?: boolean;
  includePayments?: boolean;
}

export interface DataExportResult {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
}

class GDPRService {
  private readonly EXPORT_EXPIRY_DAYS = 30;
  private readonly DELETION_GRACE_PERIOD_DAYS = 30;

  async requestDataExport(request: DataExportRequest): Promise<DataExportResult> {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { email: true, displayName: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const existingExport = await prisma.dataExport.findFirst({
      where: {
        userId: request.userId,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingExport) {
      return {
        exportId: existingExport.id,
        status: existingExport.status as any,
        message: 'Export already in progress',
      };
    }

    const dataExport = await prisma.dataExport.create({
      data: {
        userId: request.userId,
        status: 'pending',
        format: request.format || 'json',
        includeMessages: request.includeMessages ?? true,
        includeMoments: request.includeMoments ?? true,
        includeFriends: request.includeFriends ?? true,
        includeReports: request.includeReports ?? false,
        includePayments: request.includePayments ?? false,
        expiresAt: new Date(Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    setImmediate(() => this.processExport(dataExport.id));

    return {
      exportId: dataExport.id,
      status: 'pending',
      message: 'Data export request submitted',
    };
  }

  private async processExport(exportId: string): Promise<void> {
    try {
      await prisma.dataExport.update({
        where: { id: exportId },
        data: { status: 'processing' },
      });

      const dataExport = await prisma.dataExport.findUnique({
        where: { id: exportId },
        include: { user: true },
      });

      if (!dataExport) return;

      const userData = await this.collectUserData(dataExport.userId, dataExport);

      const exportPath = path.join(process.cwd(), 'exports', `${exportId}.${dataExport.format}`);
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });

      if (dataExport.format === 'json') {
        fs.writeFileSync(exportPath, JSON.stringify(userData, null, 2));
      } else {
        fs.writeFileSync(exportPath, this.convertToCSV(userData));
      }

      const stats = fs.statSync(exportPath);

      await prisma.dataExport.update({
        where: { id: exportId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          exportSize: stats.size,
        },
      });

      if (dataExport.user.email) {
        await emailService.sendDataExportEmail(
          dataExport.user.email,
          dataExport.user.displayName,
          `/api/compliance/export/${exportId}/download`,
          dataExport.expiresAt!
        );
      }

      logger.info(`Data export completed for user ${dataExport.userId}`);
    } catch (error) {
      logger.error(`Data export failed for ${exportId}:`, error);

      await prisma.dataExport.update({
        where: { id: exportId },
        data: {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async collectUserData(userId: string, dataExport: any): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        age: true,
        gender: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastActiveAt: true,
        totalSessions: true,
        totalFriends: true,
      },
    });

    const data: any = {
      exportMetadata: {
        exportId: dataExport.id,
        requestedAt: dataExport.requestedAt,
        format: dataExport.format,
        exportedBy: userId,
      },
      user,
    };

    if (dataExport.includeFriends) {
      data.friends = await prisma.friend.findMany({
        where: {
          OR: [
            { user1Id: userId, status: 'accepted' },
            { user2Id: userId, status: 'accepted' },
          ],
        },
        include: {
          user1: { select: { id: true, displayName: true } },
          user2: { select: { id: true, displayName: true } },
        },
      });
    }

    if (dataExport.includeMoments) {
      data.moments = await prisma.moment.findMany({
        where: { userId },
        select: {
          id: true,
          mediaUrl: true,
          caption: true,
          viewCount: true,
          likeCount: true,
          createdAt: true,
        },
      });
    }

    if (dataExport.includeReports) {
      data.reportsMade = await prisma.report.findMany({
        where: { reporterId: userId },
        select: { id: true, reason: true, status: true, createdAt: true },
      });

      data.reportsReceived = await prisma.report.findMany({
        where: { reportedUserId: userId },
        select: { id: true, reason: true, status: true, createdAt: true },
      });
    }

    if (dataExport.includePayments) {
      data.payments = await prisma.paymentHistory.findMany({
        where: { userId },
        select: { id: true, amount: true, currency: true, status: true, createdAt: true },
      });

      data.subscriptions = await prisma.subscription.findMany({
        where: { userId },
        select: { id: true, plan: true, status: true, amount: true, interval: true, createdAt: true },
      });
    }

    data.consentLogs = await prisma.userConsentLog.findMany({
      where: { userId },
      select: { documentType: true, documentVersion: true, consentGiven: true, createdAt: true },
    });

    return data;
  }

  private convertToCSV(data: any): string {
    const lines: string[] = [];
    lines.push('Field,Value');
    lines.push(`User ID,${data.user?.id || ''}`);
    lines.push(`Email,${data.user?.email || ''}`);
    lines.push(`Display Name,${data.user?.displayName || ''}`);
    lines.push(`Age,${data.user?.age || ''}`);
    lines.push(`Created At,${data.user?.createdAt || ''}`);
    return lines.join('\n');
  }

  async getExportStatus(exportId: string): Promise<any> {
    const dataExport = await prisma.dataExport.findUnique({
      where: { id: exportId },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        expiresAt: true,
        format: true,
        exportSize: true,
        failureReason: true,
      },
    });

    return dataExport;
  }

  async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<{ deletionId: string; message: string; gracePeriodEnds: Date }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, isMinor: true, parentalConsent: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isMinor && user.parentalConsent) {
      throw new Error('Minors with parental consent require parent to request deletion');
    }

    const gracePeriodEnds = new Date(Date.now() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const deletionLog = await prisma.accountDeletionLog.create({
      data: {
        userId,
        reason,
        status: 'pending',
        deletionMethod: 'soft',
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        accountDeletionRequested: true,
        accountDeletionRequestedAt: new Date(),
        deletedAt: gracePeriodEnds,
        deletionReason: reason,
      },
    });

    await emailService.sendAccountDeletionConfirmation(user.email!, user.displayName);

    logger.info(`Account deletion requested for user ${userId}`);

    return {
      deletionId: deletionLog.id,
      message: 'Account deletion requested. You have 30 days to cancel.',
      gracePeriodEnds,
    };
  }

  async cancelAccountDeletion(userId: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountDeletionRequested: true },
    });

    if (!user?.accountDeletionRequested) {
      throw new Error('No deletion request found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          accountDeletionRequested: false,
          accountDeletionRequestedAt: null,
          deletedAt: null,
          deletionReason: null,
        },
      });

      await tx.accountDeletionLog.updateMany({
        where: { userId, status: 'pending' },
        data: { status: 'cancelled' },
      });
    });

    logger.info(`Account deletion cancelled for user ${userId}`);

    return { message: 'Account deletion cancelled successfully' };
  }

  async processPendingDeletions(): Promise<number> {
    const now = new Date();

    const usersToDelete = await prisma.user.findMany({
      where: {
        accountDeletionRequested: true,
        deletedAt: { lte: now },
      },
      select: { id: true },
      take: 100,
    });

    let processed = 0;

    for (const user of usersToDelete) {
      try {
        await this.hardDeleteUser(user.id);
        processed++;
      } catch (error) {
        logger.error(`Failed to delete user ${user.id}:`, error);
      }
    }

    if (processed > 0) {
      logger.info(`Processed ${processed} account deletions`);
    }

    return processed;
  }

  private async hardDeleteUser(userId: string): Promise<void> {
    const userData = await this.collectUserData(userId, {
      includeMessages: true,
      includeMoments: true,
      includeFriends: true,
      includeReports: true,
      includePayments: true,
    });

    const archivePath = path.join(process.cwd(), 'deletion-archives', `${userId}.json`);
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    fs.writeFileSync(archivePath, JSON.stringify({ deletedAt: new Date(), data: userData }, null, 2));

    await prisma.$transaction(async (tx) => {
      await tx.momentReply.deleteMany({ where: { moment: { userId } } });
      await tx.momentLike.deleteMany({ where: { moment: { userId } } });
      await tx.momentView.deleteMany({ where: { moment: { userId } } });
      await tx.moment.deleteMany({ where: { userId } });

      await tx.friend.deleteMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      });

      await tx.blockedUser.deleteMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      });

      await tx.notification.deleteMany({ where: { userId } });

      await tx.matchHistory.deleteMany({
        where: { OR: [{ userId }, { matchedWith: userId }] },
      });

      await tx.videoSession.deleteMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      });

      await tx.subscription.deleteMany({ where: { userId } });
      await tx.paymentHistory.deleteMany({ where: { userId } });

      await tx.report.deleteMany({
        where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] },
      });

      await tx.moderationAction.deleteMany({ where: { userId } });

      await tx.analyticsEvent.deleteMany({ where: { userId } });

      await tx.parentalConsent.deleteMany({ where: { userId } });
      await tx.ageVerification.deleteMany({ where: { userId } });
      await tx.dataExport.deleteMany({ where: { userId } });
      await tx.userConsentLog.deleteMany({ where: { userId } });
      await tx.cookieConsent.deleteMany({ where: { userId } });

      await tx.userPreferences.deleteMany({ where: { userId } });
      await tx.userProfile.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });
    });

    await prisma.accountDeletionLog.updateMany({
      where: { userId, status: 'pending' },
      data: {
        status: 'completed',
        processedAt: new Date(),
        dataRetained: { archivePath },
      },
    });

    logger.info(`User ${userId} permanently deleted`);
  }

  async cleanupExpiredExports(): Promise<number> {
    const result = await prisma.dataExport.deleteMany({
      where: {
        status: 'completed',
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired data exports`);
    }

    return result.count;
  }

  async logConsent(
    userId: string,
    documentType: string,
    documentVersion: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.userConsentLog.create({
      data: {
        userId,
        documentType: documentType as any,
        documentVersion,
        consentGiven: true,
        ipAddress,
        userAgent,
      },
    });
  }

  async getConsentHistory(userId: string): Promise<any[]> {
    return prisma.userConsentLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const gdprService = new GDPRService();
