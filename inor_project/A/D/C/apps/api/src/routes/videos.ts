import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, optionalAuth, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const videoRouter = Router();

videoRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const category = req.query.category as string;
    const sort = (req.query.sort as string) || 'newest';

    const where: any = { status: 'PUBLISHED' };
    if (category && category !== 'all') where.category = category;

    const orderBy: any = sort === 'oldest'
      ? { publishedAt: 'asc' }
      : sort === 'popular'
        ? { views: 'desc' }
        : { publishedAt: 'desc' };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true, isVerified: true } } },
      }),
      prisma.video.count({ where }),
    ]);

    res.json({
      success: true,
      data: videos,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) { next(err); }
});

videoRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: {
        channel: { select: { id: true, name: true, handle: true, avatarUrl: true, bannerUrl: true, description: true, subscriberCount: true, isVerified: true } },
        processingJob: true,
      },
    });
    if (!video) throw new AppError('Video not found', 404);
    res.json({ success: true, data: video });
  } catch (err) { next(err); }
});

videoRouter.post('/:id/view', async (req, res, next) => {
  try {
    await prisma.video.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

videoRouter.post('/:id/like', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.like.findUnique({ where: { userId_targetId_targetType: { userId, targetId: videoId, targetType: 'VIDEO' } } });

    if (existing) {
      if (existing.type === 'LIKE') {
        await prisma.$transaction([
          prisma.like.delete({ where: { id: existing.id } }),
          prisma.video.update({ where: { id: videoId }, data: { likes: { decrement: 1 } } }),
        ]);
        return res.json({ success: true, data: { liked: false } });
      }
      await prisma.$transaction([
        prisma.like.update({ where: { id: existing.id }, data: { type: 'LIKE' } }),
        prisma.video.update({ where: { id: videoId }, data: { likes: { increment: 1 }, dislikes: { decrement: 1 } } }),
      ]);
      return res.json({ success: true, data: { liked: true } });
    }

    await prisma.$transaction([
      prisma.like.create({ data: { userId, targetId: videoId, targetType: 'VIDEO', type: 'LIKE' } }),
      prisma.video.update({ where: { id: videoId }, data: { likes: { increment: 1 } } }),
    ]);
    res.json({ success: true, data: { liked: true } });
  } catch (err) { next(err); }
});

videoRouter.post('/:id/dislike', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.like.findUnique({ where: { userId_targetId_targetType: { userId, targetId: videoId, targetType: 'VIDEO' } } });

    if (existing) {
      if (existing.type === 'DISLIKE') {
        await prisma.$transaction([
          prisma.like.delete({ where: { id: existing.id } }),
          prisma.video.update({ where: { id: videoId }, data: { dislikes: { decrement: 1 } } }),
        ]);
        return res.json({ success: true, data: { disliked: false } });
      }
      await prisma.$transaction([
        prisma.like.update({ where: { id: existing.id }, data: { type: 'DISLIKE' } }),
        prisma.video.update({ where: { id: videoId }, data: { dislikes: { increment: 1 }, likes: { decrement: 1 } } }),
      ]);
      return res.json({ success: true, data: { disliked: true } });
    }

    await prisma.$transaction([
      prisma.like.create({ data: { userId, targetId: videoId, targetType: 'VIDEO', type: 'DISLIKE' } }),
      prisma.video.update({ where: { id: videoId }, data: { dislikes: { increment: 1 } } }),
    ]);
    res.json({ success: true, data: { disliked: true } });
  } catch (err) { next(err); }
});
