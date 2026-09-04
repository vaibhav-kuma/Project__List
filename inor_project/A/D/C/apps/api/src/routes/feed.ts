import { Router } from 'express';
import { prisma } from '@yt/database';
import { optionalAuth, authenticate, type AuthRequest } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

export const feedRouter = Router();

feedRouter.get('/home', optionalAuth, cacheMiddleware({ ttl: 120 }), async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const category = req.query.category as string;

    const where: any = { status: 'PUBLISHED' };
    if (category && category !== 'all') where.category = category;

    const videos = await prisma.video.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        channel: { select: { id: true, name: true, handle: true, avatarUrl: true, subscriberCount: true, isVerified: true } },
      },
    });

    const total = await prisma.video.count({ where });

    res.json({
      success: true,
      data: videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

feedRouter.get('/subscriptions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const filter = (req.query.filter as string) || 'all';

    const subscriptions = await prisma.subscription.findMany({
      where: { subscriberId: req.user!.id },
      select: { channelId: true },
    });

    const channelIds = subscriptions.map((s) => s.channelId);
    if (channelIds.length === 0) return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });

    const where: any = { channelId: { in: channelIds }, status: 'PUBLISHED' };
    if (filter === 'today') {
      where.publishedAt = { gte: new Date(Date.now() - 86400000) };
    } else if (filter === 'unwatched') {
      const watchedIds = await prisma.watchHistory.findMany({
        where: { userId: req.user!.id },
        select: { videoId: true },
        take: 500,
      });
      where.id = { notIn: watchedIds.map((w) => w.videoId) };
    }

    const videos = await prisma.video.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true, isVerified: true } } },
    });

    res.json({ success: true, data: videos });
  } catch (err) { next(err); }
});

feedRouter.get('/trending', optionalAuth, cacheMiddleware({ ttl: 600 }), async (req, res, next) => {
  try {
    const category = req.query.category as string;
    const region = (req.query.region as string) || 'US';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const where: any = { status: 'PUBLISHED' };
    if (category && category !== 'now') where.category = category;

    const videos = await prisma.video.findMany({
      where,
      orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true, subscriberCount: true, isVerified: true } } },
    });

    res.json({ success: true, data: videos.map((v, i) => ({ rank: (page - 1) * limit + i + 1, ...v })) });
  } catch (err) { next(err); }
});
