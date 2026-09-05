import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { UploadService } from '../services/uploadService';
import logger from '../config/logger';

const createMomentSchema = z.object({
  mediaUrl: z.string().url(),
  mediaPublicId: z.string(),
  mediaType: z.enum(['image', 'video', 'gif']),
  caption: z.string().max(300).optional(),
  durationSeconds: z.number().min(1).max(30).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fileSize: z.number().optional(),
  visibility: z.enum(['public', 'friends']).default('friends'),
  filters: z.array(z.string()).optional(),
  stickers: z.array(z.object({
    type: z.string(),
    x: z.number(),
    y: z.number(),
    scale: z.number().optional(),
    rotation: z.number().optional(),
  })).optional(),
});

const updateMomentSchema = z.object({
  caption: z.string().max(300).optional(),
  visibility: z.enum(['public', 'friends']).optional(),
});

export const createMoment = async (req: AuthRequest, res: Response) => {
  try {
    const body = createMomentSchema.parse(req.body);

    const moment = await prisma.moment.create({
      data: {
        userId: req.userId!,
        mediaUrl: body.mediaUrl,
        mediaPublicId: body.mediaPublicId,
        mediaType: body.mediaType,
        caption: body.caption,
        durationSeconds: body.durationSeconds,
        width: body.width,
        height: body.height,
        fileSize: body.fileSize,
        visibility: body.visibility,
        filters: body.filters || [],
        stickers: body.stickers || [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        moderationStatus: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    logger.info(`Moment created: ${moment.id} by user ${req.userId}`);

    res.status(201).json({ moment });
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

export const getMomentsFeed = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { user1Id: req.userId!, status: 'accepted' },
          { user2Id: req.userId!, status: 'accepted' },
        ],
      },
      select: {
        user1Id: true,
        user2Id: true,
      },
    });

    const friendIds = friends.map((f) =>
      f.user1Id === req.userId! ? f.user2Id : f.user1Id
    );

    const moments = await prisma.moment.findMany({
      where: {
        isExpired: false,
        moderationStatus: 'approved',
        OR: [
          {
            userId: { in: friendIds },
            visibility: 'friends',
          },
          {
            userId: { in: friendIds },
            visibility: 'public',
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const formatted = moments.map((m) => ({
      ...m,
      viewCount: m._count.views,
      likeCount: m._count.likes,
      replyCount: m._count.replies,
      hasViewed: false,
      hasLiked: false,
    }));

    res.json({ moments: formatted });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserMoments = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const moments = await prisma.moment.findMany({
      where: {
        userId,
        isExpired: false,
        moderationStatus: 'approved',
        OR: [
          { visibility: 'public' },
          {
            visibility: 'friends',
            userId: {
              in: await prisma.friend.findMany({
                where: {
                  OR: [
                    { user1Id: userId, status: 'accepted' },
                    { user2Id: userId, status: 'accepted' },
                  ],
                },
                select: {
                  user1Id: true,
                  user2Id: true,
                },
              }).then((friends) =>
                friends.map((f) => (f.user1Id === userId ? f.user2Id : f.user1Id))
              ),
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const formatted = moments.map((m) => ({
      ...m,
      viewCount: m._count.views,
      likeCount: m._count.likes,
      replyCount: m._count.replies,
    }));

    res.json({ moments: formatted });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMomentById = async (req: Request, res: Response) => {
  try {
    const { momentId } = req.params;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
            replies: true,
          },
        },
      },
    });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.isExpired || moment.moderationStatus !== 'approved') {
      return res.status(404).json({ error: 'Moment not available' });
    }

    res.json({
      ...moment,
      viewCount: moment._count.views,
      likeCount: moment._count.likes,
      replyCount: moment._count.replies,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const viewMoment = async (req: AuthRequest, res: Response) => {
  try {
    const { momentId } = req.params;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true, isExpired: true },
    });

    if (!moment || moment.isExpired) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.userId === req.userId!) {
      return res.json({ success: true, isOwn: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.momentView.create({
        data: {
          momentId,
          viewerId: req.userId!,
        },
      }).catch(() => {});

      await tx.moment.update({
        where: { id: momentId },
        data: { viewCount: { increment: 1 } },
      });
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likeMoment = async (req: AuthRequest, res: Response) => {
  try {
    const { momentId } = req.params;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true, isExpired: true },
    });

    if (!moment || moment.isExpired) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    const existing = await prisma.momentLike.findUnique({
      where: {
        momentId_userId: {
          momentId,
          userId: req.userId!,
        },
      },
    });

    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.momentLike.delete({
          where: {
            momentId_userId: {
              momentId,
              userId: req.userId!,
            },
          },
        });

        await tx.moment.update({
          where: { id: momentId },
          data: { likeCount: { decrement: 1 } },
        });
      });

      res.json({ liked: false });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.momentLike.create({
          data: {
            momentId,
            userId: req.userId!,
          },
        });

        await tx.moment.update({
          where: { id: momentId },
          data: { likeCount: { increment: 1 } },
        });
      });

      res.json({ liked: true });
    }
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const replyToMoment = async (req: AuthRequest, res: Response) => {
  try {
    const { momentId } = req.params;
    const { content } = req.body;

    if (!content || content.length > 500) {
      return res.status(400).json({ error: 'Reply must be between 1 and 500 characters' });
    }

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true, isExpired: true },
    });

    if (!moment || moment.isExpired) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    const reply = await prisma.momentReply.create({
      data: {
        momentId,
        userId: req.userId!,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await prisma.moment.update({
      where: { id: momentId },
      data: { replyCount: { increment: 1 } },
    });

    res.status(201).json({ reply });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMomentViews = async (req: AuthRequest, res: Response) => {
  try {
    const { momentId } = req.params;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId, userId: req.userId! },
    });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    const views = await prisma.momentView.findMany({
      where: { momentId },
      include: {
        viewer: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
    });

    res.json({
      views: views.map((v) => ({
        user: v.viewer,
        viewedAt: v.viewedAt,
      })),
      totalCount: views.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMoment = async (req: AuthRequest, res: Response) => {
  try {
    const { momentId } = req.params;
    const body = updateMomentSchema.parse(req.body);

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true },
    });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.userId !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.moment.update({
      where: { id: momentId },
      data: body,
    });

    res.json({ moment: updated });
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

export const deleteMoment = async (req: AuthRequest, res: Response) => {
  try {
    const { momentId } = req.params;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true, mediaPublicId: true },
    });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.userId !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const uploadService = new UploadService();
    try {
      await uploadService.deleteFile(moment.mediaPublicId);
    } catch (error) {
      logger.warn(`Failed to delete S3 file: ${moment.mediaPublicId}`);
    }

    await prisma.moment.delete({
      where: { id: momentId },
    });

    logger.info(`Moment deleted: ${momentId} by user ${req.userId}`);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDiscoverMoments = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0, category } = req.query;

    const moments = await prisma.moment.findMany({
      where: {
        isExpired: false,
        moderationStatus: 'approved',
        visibility: 'public',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: [
        { viewCount: 'desc' },
        { likeCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Number(limit),
      skip: Number(offset),
    });

    const formatted = moments.map((m) => ({
      ...m,
      viewCount: m._count.views,
      likeCount: m._count.likes,
      replyCount: m._count.replies,
    }));

    res.json({ moments: formatted });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
