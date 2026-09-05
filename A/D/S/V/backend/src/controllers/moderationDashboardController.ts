import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';
import { AutomatedActionEngine } from '../services/automatedActionEngine';
import { mlModerationService } from '../services/mlModerationService';

const banUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(10).max(500),
  duration: z.enum(['temporary', 'permanent', 'shadow']).optional(),
  durationHours: z.number().int().positive().optional(),
});

const warnUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

const clearUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

export const getDashboardOverview = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalReports,
      pendingReports,
      resolvedReports,
      totalBans,
      activeBans,
      pendingAppeals,
      totalActions,
      mlStats,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.moderationAction.count({ where: { actionType: 'permanent_ban' } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.moderationAction.count({ where: { appealStatus: 'pending' } }),
      prisma.moderationAction.count(),
      Promise.resolve(mlModerationService.getStats()),
    ]);

    const recentActivity = await prisma.report.findMany({
      where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: {
        id: true,
        reason: true,
        severity: true,
        status: true,
        createdAt: true,
        reportedUser: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const severityDistribution = await prisma.report.groupBy({
      by: ['reason'],
      _count: true,
      where: {
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const actionDistribution = await prisma.moderationAction.groupBy({
      by: ['actionType'],
      _count: true,
      where: {
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    res.json({
      overview: {
        totalReports,
        pendingReports,
        resolvedReports,
        totalBans,
        activeBans,
        pendingAppeals,
        totalActions,
        mlStats,
      },
      recentActivity,
      severityDistribution,
      actionDistribution,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        age: true,
        gender: true,
        status: true,
        isVerified: true,
        isPremium: true,
        severityScore: true,
        isBanned: true,
        banReason: true,
        banExpiresAt: true,
        isShadowBanned: true,
        totalSessions: true,
        totalFriends: true,
        totalReportsReceived: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const moderationHistory = await AutomatedActionEngine.getUserModerationHistory(userId);

    const recentSessions = await prisma.videoSession.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        startedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        durationSeconds: true,
        wasReported: true,
        flaggedContent: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const patternAnalysis = await analyzeUserPatterns(userId);

    res.json({
      user,
      moderationHistory,
      recentSessions,
      patternAnalysis,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const body = banUserSchema.parse(req.body);

    const { action, message } = await AutomatedActionEngine.executeAction(
      body.userId,
      body.duration === 'shadow' ? 'shadow_ban' :
      body.duration === 'permanent' ? 'permanent_ban' : 'temporary_ban',
      body.reason,
      undefined,
      req.userId!,
      false
    );

    if (body.duration === 'temporary' && body.durationHours) {
      const expiresAt = new Date(Date.now() + body.durationHours * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: body.userId },
        data: { banExpiresAt: expiresAt },
      });
    }

    res.json({ action, message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const warnUser = async (req: AuthRequest, res: Response) => {
  try {
    const body = warnUserSchema.parse(req.body);

    const { action, message } = await AutomatedActionEngine.executeAction(
      body.userId,
      'warning',
      body.reason,
      undefined,
      req.userId!,
      false
    );

    res.json({ action, message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clearUser = async (req: AuthRequest, res: Response) => {
  try {
    const body = clearUserSchema.parse(req.body);

    await prisma.user.update({
      where: { id: body.userId },
      data: {
        isBanned: false,
        banReason: null,
        banExpiresAt: null,
        isShadowBanned: false,
        severityScore: { decrement: 1 },
      },
    });

    await prisma.moderationAction.create({
      data: {
        userId: body.userId,
        actionType: 'warning',
        reason: `Cleared: ${body.reason}`,
        moderatorId: req.userId!,
        isAuto: false,
      },
    });

    logger.info(`User ${body.userId} cleared by moderator ${req.userId}`);

    res.json({ message: 'User cleared' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBannedUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'all', limit = 50, offset = 0 } = req.query;

    const where: any = { isBanned: true };

    if (type === 'permanent') {
      where.banExpiresAt = null;
    } else if (type === 'temporary') {
      where.banExpiresAt = { not: null };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        severityScore: true,
        banReason: true,
        banExpiresAt: true,
        totalReportsReceived: true,
        createdAt: true,
      },
      orderBy: { severityScore: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.user.count({ where });

    res.json({ users, total });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getModerationLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, actionType, moderatorId } = req.query;

    const where: any = {};

    if (actionType) {
      where.actionType = actionType;
    }

    if (moderatorId) {
      where.moderatorId = moderatorId;
    }

    const logs = await prisma.moderationAction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.moderationAction.count({ where });

    res.json({ logs, total });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMLThresholds = async (req: AuthRequest, res: Response) => {
  try {
    const { thresholds } = req.body;

    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ error: 'Thresholds object required' });
    }

    mlModerationService.updateThresholds(thresholds);

    res.json({ message: 'ML thresholds updated', thresholds: mlModerationService.getStats() });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMLStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = mlModerationService.getStats();

    const flaggedSessions = await prisma.videoSession.count({
      where: { flaggedContent: true },
    });

    const recentFlags = await prisma.videoSession.findMany({
      where: {
        flaggedContent: true,
        startedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
        startedAt: true,
        durationSeconds: true,
        moderationScore: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    res.json({
      mlStats: stats,
      flaggedSessions,
      recentFlags,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function analyzeUserPatterns(userId: string) {
  const reports = await prisma.report.findMany({
    where: { reportedUserId: userId },
    select: {
      reason: true,
      createdAt: true,
      severity: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const sessions = await prisma.videoSession.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      wasReported: true,
    },
    select: {
      id: true,
      startedAt: true,
      reportReason: true,
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  const reasonFrequency: Record<string, number> = {};
  reports.forEach((r) => {
    reasonFrequency[r.reason] = (reasonFrequency[r.reason] || 0) + 1;
  });

  const timePattern: Record<string, number> = {};
  sessions.forEach((s) => {
    const hour = s.startedAt.getHours();
    const period = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    timePattern[period] = (timePattern[period] || 0) + 1;
  });

  const riskLevel = reports.length >= 10 ? 'high' :
                    reports.length >= 5 ? 'medium' :
                    reports.length >= 2 ? 'low' : 'none';

  return {
    totalReports: reports.length,
    reasonFrequency,
    timePattern,
    riskLevel,
    reportTrend: reports.length > 0 ? 'increasing' : 'stable',
  };
}
