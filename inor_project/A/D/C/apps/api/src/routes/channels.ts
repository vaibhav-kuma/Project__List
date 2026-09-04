import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, optionalAuth, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const channelRouter = Router();

channelRouter.get('/:handle', optionalAuth, async (req, res, next) => {
  try {
    const handle = req.params.handle.startsWith('@') ? req.params.handle : `@${req.params.handle}`;
    const channel = await prisma.channel.findUnique({
      where: { handle },
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { subscriptions: true } },
      },
    });
    if (!channel) throw new AppError('Channel not found', 404);
    res.json({ success: true, data: channel });
  } catch (err) { next(err); }
});

channelRouter.get('/:id/videos', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const sort = (req.query.sort as string) || 'latest';

    const orderBy = sort === 'popular' ? { views: 'desc' as const } : { publishedAt: 'desc' as const };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { channelId: req.params.id, status: 'PUBLISHED' },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.video.count({ where: { channelId: req.params.id, status: 'PUBLISHED' } }),
    ]);

    res.json({
      success: true,
      data: videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

channelRouter.get('/:id/playlists', async (req, res, next) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { channelId: req.params.id, visibility: 'PUBLIC' },
      include: { _count: { select: { videos: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: playlists });
  } catch (err) { next(err); }
});

channelRouter.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel || channel.userId !== req.user!.id) {
      throw new AppError('Unauthorized', 403);
    }
    const updated = await prisma.channel.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        customUrl: req.body.customUrl,
        country: req.body.country,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
