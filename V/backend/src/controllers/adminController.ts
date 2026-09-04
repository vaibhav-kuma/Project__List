import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';
import { adminAnalyticsService } from '../services/adminAnalyticsService';

const userFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'banned', 'suspended', 'deleted']).optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).optional(),
  ageMin: z.number().int().min(0).optional(),
  ageMax: z.number().int().min(0).optional(),
  isPremium: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  ageVerified: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'lastActiveAt', 'displayName', 'age']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const banUserSchema = z.object({
  reason: z.string().min(1).max(500),
  duration: z.number().int().min(1).optional(),
});

const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'suspend', 'ban']),
  notes: z.string().max(1000).optional(),
});

const updateAgeVerificationSchema = z.object({
  verified: z.boolean(),
  verifiedAge: z.number().int().min(0).max(150).optional(),
  notes: z.string().max(500).optional(),
});

const systemAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  type: z.enum(['info', 'warning', 'critical']).optional(),
  targetAudience: z.enum(['all', 'premium', 'free', 'minors']).optional(),
});

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminAnalyticsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [retention, geographic, timeline, premium] = await Promise.all([
      adminAnalyticsService.getUserRetention(),
      adminAnalyticsService.getGeographicDistribution(),
      adminAnalyticsService.getActivityTimeline(30),
      adminAnalyticsService.getPremiumAnalytics(),
    ]);

    res.json({ retention, geographic, timeline, premium });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const health = await adminAnalyticsService.getSystemHealth();
    res.json(health);
  } catch (error) {
    logger.error('Get system health error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const filters = userFilterSchema.parse(req.query);

    const {
      search,
      status,
      gender,
      ageMin,
      ageMax,
      isPremium,
      isVerified,
      ageVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'banned') where.isBanned = true;
    else if (status === 'active') where.isBanned = false;
    else if (status === 'deleted') where.deletedAt = { not: null };

    if (gender) where.gender = gender;
    if (ageMin) where.age = { ...where.age, gte: ageMin };
    if (ageMax) where.age = { ...where.age, lte: ageMax };
    if (isPremium !== undefined) where.isPremium = isPremium;
    if (isVerified !== undefined) where.isVerified = isVerified;
    if (ageVerified !== undefined) where.ageVerified = ageVerified;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          age: true,
          gender: true,
          avatarUrl: true,
          status: true,
          isPremium: true,
          premiumTier: true,
          isVerified: true,
          isBanned: true,
          banReason: true,
          banExpiresAt: true,
          ageVerified: true,
          parentalConsent: true,
          lastActiveAt: true,
          createdAt: true,
          _count: {
            select: {
              moments: true,
              friendsAsUser1: true,
              reportsReceived: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid filters', details: error.errors });
    }
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: true,
        ageVerifications: { orderBy: { createdAt: 'desc' }, take: 5 },
        parentalConsents: { orderBy: { createdAt: 'desc' }, take: 5 },
        reportsMade: { orderBy: { createdAt: 'desc' }, take: 10 },
        reportsReceived: { orderBy: { createdAt: 'desc' }, take: 10 },
        moderationActions: { orderBy: { createdAt: 'desc' }, take: 10 },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [matchCount, sessionStats] = await Promise.all([
      prisma.matchHistory.count({ where: { userId } }),
      prisma.videoSession.aggregate({
        _count: true,
        _avg: { durationSeconds: true },
        _sum: { durationSeconds: true },
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      }),
    ]);

    res.json({
      ...user,
      matchCount,
      sessionStats: {
        totalSessions: sessionStats._count,
        avgDuration: Math.round(sessionStats._avg.durationSeconds || 0),
        totalDuration: sessionStats._sum.durationSeconds || 0,
      },
    });
  } catch (error) {
    logger.error('Get user detail error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

export const banUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = banUserSchema.parse(req.body);

    const banExpiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        banExpiresAt,
        status: 'banned' as any,
      },
    });

    await prisma.moderationAction.create({
      data: {
        userId,
        actionType: 'permanent_ban',
        reason,
      },
    });

    logger.info(`User ${userId} banned: ${reason}`);
    res.json({ success: true, message: 'User banned successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    logger.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

export const unbanUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        banExpiresAt: null,
        status: 'offline' as any,
      },
    });

    await prisma.moderationAction.create({
      data: {
        userId,
        actionType: 'warning' as any,
        reason: 'Unbanned by admin',
      },
    });

    logger.info(`User ${userId} unbanned`);
    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (error) {
    logger.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
};

export const verifyUserAge = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { verified, verifiedAge, notes } = updateAgeVerificationSchema.parse(req.body);

    const updateData: any = {
      ageVerified: verified,
      ageVerificationMethod: 'manual_review',
      ageVerificationDate: new Date(),
    };

    if (verifiedAge) {
      updateData.estimatedAge = verifiedAge;
      updateData.isMinor = verifiedAge < 18;
      updateData.restrictedMode = verifiedAge < 18;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await prisma.ageVerification.create({
      data: {
        userId,
        method: 'id_verification_api' as any,
        status: verified ? 'verified' : 'rejected',
        verifiedAge,
        rejectionReason: notes,
        reviewerId: (req as any).userId,
        reviewedAt: new Date(),
      },
    });

    logger.info(`User ${userId} age verification: ${verified ? 'approved' : 'rejected'}`);
    res.json({ success: true, message: 'Age verification updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    logger.error('Verify user age error:', error);
    res.status(500).json({ error: 'Failed to update age verification' });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const { status = 'pending', page = 1, limit = 20, type } = req.query as any;

    const where: any = {};
    if (status !== 'all') where.status = status;
    if (type) where.reason = type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, displayName: true, avatarUrl: true } },
          reportedUser: { select: { id: true, displayName: true, avatarUrl: true, isBanned: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const resolveReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = resolveReportSchema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { reportedUser: true },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'resolved',
        resolutionNotes: notes,
        resolvedAt: new Date(),
        resolvedBy: (req as any).userId,
      },
    });

    if (action === 'warn' || action === 'suspend' || action === 'ban') {
      await prisma.moderationAction.create({
        data: {
          userId: report.reportedUserId,
          actionType: action === 'ban' ? 'permanent_ban' : action === 'suspend' ? 'temporary_ban' : 'warning',
          reason: notes || `Resolved report: ${report.reason}`,
          reportId,
        },
      });

      if (action === 'ban') {
        await prisma.user.update({
          where: { id: report.reportedUserId },
          data: { isBanned: true, banReason: notes || 'Banned due to report', status: 'banned' as any },
        });
      }
    }

    logger.info(`Report ${reportId} resolved with action: ${action}`);
    res.json({ success: true, message: 'Report resolved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    logger.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

export const getModerationQueue = async (req: Request, res: Response) => {
  try {
    const [pendingReports, flaggedMoments, userAppeals] = await Promise.all([
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.moment.count({ where: { moderationStatus: 'flagged' } }),
      prisma.report.count({ where: { status: 'reviewing' } }),
    ]);

    const recentReports = await prisma.report.findMany({
      where: { status: 'pending' },
      include: {
        reporter: { select: { displayName: true } },
        reportedUser: { select: { displayName: true, isBanned: true } },
      },
      orderBy: { priority: 'desc' },
      take: 20,
    });

    res.json({
      queue: {
        pendingReports,
        flaggedMoments,
        userAppeals,
        total: pendingReports + flaggedMoments + userAppeals,
      },
      recentReports,
    });
  } catch (error) {
    logger.error('Get moderation queue error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation queue' });
  }
};

export const getFlaggedContent = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query as any;

    const [moments, total] = await Promise.all([
      prisma.moment.findMany({
        where: { moderationStatus: 'flagged' },
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.moment.count({ where: { moderationStatus: 'flagged' } }),
    ]);

    res.json({
      moments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get flagged content error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged content' });
  }
};

export const moderateContent = async (req: Request, res: Response) => {
  try {
    const { momentId } = req.params;
    const { action, reason } = req.body;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      include: { user: true },
    });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (action === 'approve') {
      await prisma.moment.update({
        where: { id: momentId },
        data: { moderationStatus: 'approved' },
      });
    } else if (action === 'remove') {
      await prisma.moment.update({
        where: { id: momentId },
        data: { moderationStatus: 'rejected', isExpired: true },
      });

      await prisma.moderationAction.create({
        data: {
          userId: moment.userId,
          actionType: 'feature_restriction',
          reason: reason || 'Content removed by moderator',
        },
      });
    }

    logger.info(`Moment ${momentId} moderated: ${action}`);
    res.json({ success: true, message: `Content ${action}d` });
  } catch (error) {
    logger.error('Moderate content error:', error);
    res.status(500).json({ error: 'Failed to moderate content' });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, message, type = 'info', targetAudience = 'all' } = systemAnnouncementSchema.parse(req.body);

    const announcement = await prisma.notification.createMany({
      data: [],
    });

    const where: any = {};
    if (targetAudience === 'premium') where.isPremium = true;
    else if (targetAudience === 'free') where.isPremium = false;
    else if (targetAudience === 'minors') where.isMinor = true;

    const targetUsers = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    const notificationData = targetUsers.map((user) => ({
      userId: user.id,
      type: 'system_announcement' as any,
      title,
      message,
      targetType: 'announcement',
      metadata: { type, targetAudience, createdBy: (req as any).userId },
    }));

    await prisma.notification.createMany({
      data: notificationData,
    });

    logger.info(`Announcement created: ${title} (${targetUsers.length} recipients)`);
    res.json({ success: true, message: `Announcement sent to ${targetUsers.length} users` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    logger.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

export const getErrorLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, hours = 24 } = req.query as any;

    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const [errors, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: {
          eventType: 'error',
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.analyticsEvent.count({
        where: { eventType: 'error', createdAt: { gte: since } },
      }),
    ]);

    res.json({
      errors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get error logs error:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
};

export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      activeSessions,
      recentMatches,
      recentReports,
      avgSessionDuration,
      peakHourData,
    ] = await Promise.all([
      prisma.videoSession.count({ where: { endedAt: null } }),
      prisma.matchHistory.count({ where: { createdAt: { gte: hourAgo } } }),
      prisma.report.count({ where: { createdAt: { gte: hourAgo } } }),
      prisma.videoSession.aggregate({
        _avg: { durationSeconds: true },
        where: { endedAt: { gte: hourAgo } },
      }),
      prisma.videoSession.groupBy({
        by: ['startedAt'],
        _count: { startedAt: true },
        where: { startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        orderBy: { _count: { startedAt: 'desc' } },
        take: 1,
      }),
    ]);

    res.json({
      activeSessions,
      matchesPerHour: recentMatches,
      reportsPerHour: recentReports,
      avgSessionDuration: Math.round(avgSessionDuration._avg.durationSeconds || 0),
      peakHour: peakHourData[0]?.startedAt || null,
      peakHourSessions: peakHourData[0]?._count.startedAt || 0,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
};
