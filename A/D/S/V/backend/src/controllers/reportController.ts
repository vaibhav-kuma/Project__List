import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';
import { AutomatedActionEngine } from '../services/automatedActionEngine';
import { emailService } from '../services/emailService';
import { adminSocketService } from '../services/adminSocketService';

const createReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  momentId: z.string().uuid().optional(),
  reason: z.enum(['inappropriate', 'harassment', 'spam', 'underage', 'hate_speech', 'violence', 'scam', 'other']),
  description: z.string().max(1000).optional(),
  evidenceUrls: z.array(z.string()).optional(),
  screenshotUrl: z.string().url().optional(),
});

const updateReportSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed', 'escalated']).optional(),
  actionTaken: z.enum(['warning', 'temporary_ban', 'permanent_ban', 'shadow_ban', 'feature_restriction']).optional(),
  resolutionNotes: z.string().optional(),
});

const submitAppealSchema = z.object({
  moderationActionId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
  evidenceUrls: z.array(z.string()).optional(),
});

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const body = createReportSchema.parse(req.body);

    if (!body.sessionId && !body.momentId) {
      return res.status(400).json({ error: 'Either sessionId or momentId is required' });
    }

    const severityMap: Record<string, number> = {
      underage: 10,
      hate_speech: 8,
      violence: 7,
      harassment: 5,
      scam: 4,
      inappropriate: 3,
      spam: 2,
      other: 1,
    };

    const severity = severityMap[body.reason] || 2;
    const priority = severity >= 8 ? 5 : severity >= 5 ? 3 : 1;

    const report = await prisma.report.create({
      data: {
        reporterId: req.userId!,
        reportedUserId: body.reportedUserId,
        sessionId: body.sessionId,
        momentId: body.momentId,
        reason: body.reason,
        description: body.description,
        evidenceUrls: body.evidenceUrls || [],
        screenshotUrl: body.screenshotUrl,
        severity,
        priority,
      },
    });

    if (body.sessionId) {
      await prisma.videoSession.update({
        where: { id: body.sessionId },
        data: { wasReported: true, reportedBy: req.userId!, reportReason: body.reason },
      });
    }

    const { action, message } = await AutomatedActionEngine.processViolation(
      body.reportedUserId,
      body.reason,
      severity,
      body.sessionId
    );

    const reporter = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, displayName: true },
    });

    if (reporter?.email) {
      await emailService.sendReportUpdateEmail(
        reporter.email,
        reporter.displayName,
        report.id,
        'submitted',
        'Your report has been submitted and is under review.'
      );
    }

    logger.info(`Report created: ${report.id} by ${req.userId!} against ${body.reportedUserId}`);

    adminSocketService.emitNewReport({
      reportId: report.id,
      reporterId: req.userId,
      reportedUserId: body.reportedUserId,
      reason: body.reason,
      severity,
      priority,
    });

    res.status(201).json({
      report,
      moderationAction: action,
      message,
    });
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

export const submitAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const body = submitAppealSchema.parse(req.body);

    const moderationAction = await prisma.moderationAction.findUnique({
      where: { id: body.moderationActionId },
      include: { user: { select: { email: true, displayName: true } } },
    });

    if (!moderationAction) {
      return res.status(404).json({ error: 'Moderation action not found' });
    }

    if (moderationAction.userId !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized to appeal this action' });
    }

    if (moderationAction.appealStatus !== 'none') {
      return res.status(400).json({ error: `Appeal already ${moderationAction.appealStatus}` });
    }

    const updated = await prisma.moderationAction.update({
      where: { id: body.moderationActionId },
      data: {
        appealStatus: 'pending',
        appealNotes: body.reason,
        details: {
          evidenceUrls: body.evidenceUrls,
          submittedAt: new Date(),
        },
      },
    });

    logger.info(`Appeal submitted for action ${body.moderationActionId} by ${req.userId!}`);

    res.status(201).json({
      appeal: {
        id: updated.id,
        status: updated.appealStatus,
        submittedAt: new Date(),
      },
      message: 'Appeal submitted successfully',
    });
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

export const getMyReports = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const reports = await prisma.report.findMany({
      where: { reporterId: req.userId! },
      include: {
        reportedUser: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({ reports });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyAppeals = async (req: AuthRequest, res: Response) => {
  try {
    const appeals = await prisma.moderationAction.findMany({
      where: {
        userId: req.userId!,
        appealStatus: { not: 'none' },
      },
      select: {
        id: true,
        actionType: true,
        reason: true,
        appealStatus: true,
        appealNotes: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ appeals });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getModerationQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'pending', limit = 50, priority } = req.query;

    const where: any = { status: status as any };

    if (priority) {
      where.priority = { gte: Number(priority) };
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, displayName: true } },
        reportedUser: {
          select: {
            id: true,
            displayName: true,
            severityScore: true,
            totalReportsReceived: true,
            isBanned: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { severity: 'desc' },
        { createdAt: 'asc' },
      ],
      take: Number(limit),
    });

    const queueStats = await getQueueStats();

    res.json({ reports, queueStats });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReport = async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const body = updateReportSchema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: { select: { email: true, displayName: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        ...body,
        resolvedAt: body.status === 'resolved' || body.status === 'dismissed' ? new Date() : undefined,
        resolvedBy: req.userId!,
      },
    });

    if (body.actionTaken && report.reportedUserId) {
      await prisma.moderationAction.create({
        data: {
          userId: report.reportedUserId,
          reportId,
          actionType: body.actionTaken,
          reason: body.resolutionNotes || `Action taken on report: ${report.reason}`,
          durationHours: body.actionTaken === 'permanent_ban' ? undefined :
                         body.actionTaken === 'temporary_ban' ? 168 :
                         body.actionTaken === 'warning' ? 0 : undefined,
          expiresAt: body.actionTaken === 'temporary_ban' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
          moderatorId: req.userId!,
          isAuto: false,
        },
      });

      if (body.actionTaken === 'permanent_ban') {
        await prisma.user.update({
          where: { id: report.reportedUserId },
          data: { isBanned: true, banReason: body.resolutionNotes || 'Permanent ban by moderator' },
        });
      } else if (body.actionTaken === 'temporary_ban') {
        await prisma.user.update({
          where: { id: report.reportedUserId },
          data: {
            isBanned: true,
            banReason: body.resolutionNotes || 'Temporary ban',
            banExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      if (report.reportedUser?.email) {
        await emailService.sendModerationEmail(
          report.reportedUser.email,
          report.reportedUser.displayName,
          body.actionTaken,
          body.resolutionNotes || `Action taken on report: ${report.reason}`,
          body.actionTaken === 'temporary_ban' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined
        );
      }
    }

    const reporter = await prisma.user.findUnique({
      where: { id: report.reporterId },
      select: { email: true, displayName: true },
    });

    if (reporter?.email && body.status) {
      await emailService.sendReportUpdateEmail(
        reporter.email,
        reporter.displayName,
        reportId,
        body.status,
        body.resolutionNotes
      );
    }

    res.json({ report: updated });
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

export const reviewAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const { appealId } = req.params;
    const { decision, notes } = req.body;

    if (!['approved', 'denied'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "denied"' });
    }

    const moderationAction = await prisma.moderationAction.findUnique({
      where: { id: appealId },
      include: { user: { select: { email: true, displayName: true } } },
    });

    if (!moderationAction) {
      return res.status(404).json({ error: 'Moderation action not found' });
    }

    if (moderationAction.appealStatus !== 'pending') {
      return res.status(400).json({ error: 'Appeal is not pending review' });
    }

    const updated = await prisma.moderationAction.update({
      where: { id: appealId },
      data: {
        appealStatus: decision,
        appealNotes: notes || moderationAction.appealNotes,
      },
    });

    if (decision === 'approved') {
      await prisma.user.update({
        where: { id: moderationAction.userId },
        data: {
          isBanned: false,
          banReason: null,
          banExpiresAt: null,
          isShadowBanned: false,
        },
      });
    }

    if (moderationAction.user.email) {
      await emailService.sendAppealStatusEmail(
        moderationAction.user.email,
        moderationAction.user.displayName,
        decision,
        notes
      );
    }

    logger.info(`Appeal ${appealId} ${decision} by moderator ${req.userId}`);

    res.json({
      appeal: {
        id: updated.id,
        status: updated.appealStatus,
        decision,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportsAgainstUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const reports = await prisma.report.findMany({
      where: { reportedUserId: userId },
      include: {
        reporter: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { severityScore: true, isBanned: true, banReason: true, banExpiresAt: true },
    });

    const moderationHistory = await AutomatedActionEngine.getUserModerationHistory(userId);

    res.json({ reports, user, moderationHistory });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingAppeals = async (req: AuthRequest, res: Response) => {
  try {
    const appeals = await prisma.moderationAction.findMany({
      where: { appealStatus: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            severityScore: true,
            totalReportsReceived: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ appeals });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function getQueueStats() {
  const [pending, reviewing, escalated, highPriority] = await Promise.all([
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.report.count({ where: { status: 'reviewing' } }),
    prisma.report.count({ where: { status: 'escalated' } }),
    prisma.report.count({ where: { priority: { gte: 4 }, status: 'pending' } }),
  ]);

  const avgResolutionTime = await prisma.report.aggregate({
    where: {
      status: { in: ['resolved', 'dismissed'] },
      resolvedAt: { not: null },
      createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    _avg: {
      severity: true,
    },
  });

  return {
    pending,
    reviewing,
    escalated,
    highPriority,
    avgSeverity: avgResolutionTime._avg.severity || 0,
  };
}

async function calculateSeverityScore(userId: string): Promise<number> {
  const reports = await prisma.report.findMany({
    where: {
      reportedUserId: userId,
      status: { in: ['resolved', 'escalated'] },
      actionTaken: { not: null },
      createdAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    select: { reason: true },
  });

  const scores: Record<string, number> = {
    underage: 10,
    hate_speech: 8,
    violence: 7,
    harassment: 5,
    scam: 4,
    inappropriate: 3,
    spam: 2,
    other: 1,
  };

  return reports.reduce((sum, r) => sum + (scores[r.reason] || 1), 0);
}

