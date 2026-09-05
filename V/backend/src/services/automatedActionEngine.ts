import prisma from '../config/database';
import logger from '../config/logger';
import { Server } from 'socket.io';
import { emailService } from './emailService';

export interface ModerationAction {
  userId: string;
  actionType: 'warning' | 'temporary_ban' | 'permanent_ban' | 'shadow_ban' | 'feature_restriction';
  reason: string;
  durationHours?: number;
  reportId?: string;
  moderatorId?: string;
  isAuto?: boolean;
}

export interface StrikeInfo {
  userId: string;
  strikeCount: number;
  strikes: Array<{
    id: string;
    reason: string;
    actionType: string;
    createdAt: Date;
    expiresAt?: Date;
  }>;
  nextAction: string;
}

let ioInstance: Server | null = null;

export function setModerationIO(io: Server) {
  ioInstance = io;
}

function emitToUser(userId: string, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit(event, data);
  }
}

export class AutomatedActionEngine {
  private static STRIKE_THRESHOLDS = {
    warning: 1,
    temporary_ban_1: 2,
    temporary_ban_2: 3,
    permanent_ban: 4,
  };

  private static BAN_DURATIONS = {
    temporary_ban_1: 24,
    temporary_ban_2: 168,
  };

  static async processViolation(userId: string, reason: string, severity: number, sessionId?: string): Promise<{ action: string; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        severityScore: true,
        isBanned: true,
        totalReportsReceived: true,
      },
    });

    if (!user) {
      return { action: 'none', message: 'User not found' };
    }

    const severityScore = user.severityScore + severity;
    const strikeCount = await this.getStrikeCount(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        severityScore,
        totalReportsReceived: { increment: 1 },
      },
    });

    const action = this.determineAction(strikeCount, severityScore, severity);

    if (action) {
      const result = await this.executeAction(userId, action, reason, sessionId);
      return result;
    }

    return { action: 'none', message: 'Violation recorded, no action required' };
  }

  static async executeAction(
    userId: string,
    actionType: ModerationAction['actionType'],
    reason: string,
    sessionId?: string,
    moderatorId?: string,
    isAuto: boolean = true
  ): Promise<{ action: string; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });

    if (!user) {
      return { action: 'none', message: 'User not found' };
    }

    const actionData: any = {
      userId,
      actionType,
      reason,
      moderatorId,
      isAuto,
    };

    let message = '';

    switch (actionType) {
      case 'warning':
        actionData.durationHours = 0;
        message = 'Warning issued';
        break;

      case 'temporary_ban':
        const duration = this.getBanDuration(userId);
        actionData.durationHours = duration;
        actionData.expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
        message = `Temporary ban for ${duration} hours`;

        await prisma.user.update({
          where: { id: userId },
          data: {
            isBanned: true,
            banReason: reason,
            banExpiresAt: actionData.expiresAt,
          },
        });
        break;

      case 'permanent_ban':
        message = 'Permanent ban issued';

        await prisma.user.update({
          where: { id: userId },
          data: {
            isBanned: true,
            banReason: reason,
            banExpiresAt: null,
          },
        });
        break;

      case 'shadow_ban':
        message = 'Shadow ban applied';

        await prisma.user.update({
          where: { id: userId },
          data: {
            isShadowBanned: true,
          },
        });
        break;

      case 'feature_restriction':
        message = 'Feature restrictions applied';
        break;
    }

    const moderationAction = await prisma.moderationAction.create({
      data: actionData,
    });

    if (sessionId) {
      await prisma.videoSession.updateMany({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          flaggedContent: true,
        },
      });
    }

    emitToUser(userId, 'moderation_action', {
      actionType,
      reason,
      message,
      expiresAt: actionData.expiresAt,
    });

    try {
      await emailService.sendModerationEmail(user.email!, user.displayName, actionType, reason, actionData.expiresAt);
    } catch (error) {
      logger.error('Failed to send moderation email:', error);
    }

    logger.info(`Moderation action ${actionType} applied to ${userId}: ${reason}`);

    return { action: actionType, message };
  }

  static async handleMLViolation(userId: string, sessionId: string, violation: string, confidence: number): Promise<{ action: string; message: string }> {
    const severity = Math.ceil(confidence * 5);

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: userId,
        sessionId,
        reason: violation === 'nudity' ? 'inappropriate' :
                violation === 'violence' ? 'violence' : 'other',
        description: `ML detection: ${violation} (confidence: ${confidence.toFixed(2)})`,
        severity,
        priority: severity >= 4 ? 5 : 3,
      },
    });

    if (confidence >= 0.95) {
      return this.executeAction(
        userId,
        'temporary_ban',
        `Auto-ban: ML detected ${violation} (confidence: ${confidence.toFixed(2)})`,
        sessionId,
        undefined,
        true
      );
    }

    if (confidence >= 0.80) {
      return this.processViolation(userId, `ML flagged ${violation}`, severity, sessionId);
    }

    return { action: 'flagged', message: 'Content flagged for review' };
  }

  static async getStrikeInfo(userId: string): Promise<StrikeInfo> {
    const strikes = await prisma.moderationAction.findMany({
      where: {
        userId,
        actionType: { in: ['warning', 'temporary_ban', 'permanent_ban'] },
        createdAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        reason: true,
        actionType: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedStrikes = strikes.map((s) => ({
      id: s.id,
      reason: s.reason,
      actionType: s.actionType,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt || undefined,
    }));

    const strikeCount = strikes.length;
    let nextAction = 'none';

    if (strikeCount >= 4) {
      nextAction = 'permanent_ban';
    } else if (strikeCount >= 3) {
      nextAction = 'permanent_ban';
    } else if (strikeCount >= 2) {
      nextAction = 'temporary_ban';
    } else if (strikeCount >= 1) {
      nextAction = 'temporary_ban';
    }

    return {
      userId,
      strikeCount,
      strikes: formattedStrikes,
      nextAction,
    };
  }

  static async getStrikeCount(userId: string): Promise<number> {
    const count = await prisma.moderationAction.count({
      where: {
        userId,
        actionType: { in: ['warning', 'temporary_ban', 'permanent_ban'] },
        createdAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    return count;
  }

  private static determineAction(strikeCount: number, severityScore: number, severity: number): ModerationAction['actionType'] | null {
    if (severity >= 8) {
      return 'permanent_ban';
    }

    if (severityScore >= 20) {
      return 'permanent_ban';
    }

    if (strikeCount >= 4) {
      return 'permanent_ban';
    }

    if (strikeCount >= 3) {
      return 'temporary_ban';
    }

    if (strikeCount >= 2) {
      return 'temporary_ban';
    }

    if (strikeCount >= 1 || severityScore >= 5) {
      return 'warning';
    }

    return null;
  }

  private static getBanDuration(userId: string): number {
    const strikeCount = this.getStrikeCount(userId);
    return this.BAN_DURATIONS[`temporary_ban_${strikeCount}` as keyof typeof this.BAN_DURATIONS] || 168;
  }

  static async liftExpiredBans(): Promise<number> {
    const now = new Date();

    const result = await prisma.user.updateMany({
      where: {
        isBanned: true,
        banExpiresAt: { lt: now },
      },
      data: {
        isBanned: false,
        banReason: null,
        banExpiresAt: null,
      },
    });

    if (result.count > 0) {
      logger.info(`Lifted ${result.count} expired bans`);
    }

    return result.count;
  }

  static async liftExpiredRestrictions(): Promise<number> {
    const now = new Date();

    const result = await prisma.moderationAction.updateMany({
      where: {
        expiresAt: { lt: now },
        appealStatus: 'none',
      },
      data: {
        appealStatus: 'expired',
      },
    });

    return result.count;
  }

  static async getUserModerationHistory(userId: string): Promise<{
    strikes: StrikeInfo;
    reports: any[];
    actions: any[];
    severityScore: number;
  }> {
    const strikes = await this.getStrikeInfo(userId);

    const reports = await prisma.report.findMany({
      where: { reportedUserId: userId },
      select: {
        id: true,
        reason: true,
        severity: true,
        status: true,
        createdAt: true,
        actionTaken: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const actions = await prisma.moderationAction.findMany({
      where: { userId },
      select: {
        id: true,
        actionType: true,
        reason: true,
        isAuto: true,
        createdAt: true,
        expiresAt: true,
        appealStatus: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { severityScore: true },
    });

    return {
      strikes,
      reports,
      actions,
      severityScore: user?.severityScore || 0,
    };
  }
}

