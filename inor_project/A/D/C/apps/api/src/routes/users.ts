import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const search = req.query.search as string;

    const where: any = { userId: req.user!.id };
    if (search) where.video = { title: { contains: search, mode: 'insensitive' } };

    const [history, total] = await Promise.all([
      prisma.watchHistory.findMany({
        where,
        orderBy: { watchedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { video: { select: { id: true, title: true, thumbnailUrl: true, duration: true, views: true, channel: { select: { id: true, name: true } } } } },
      }),
      prisma.watchHistory.count({ where }),
    ]);

    res.json({ success: true, data: history, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 } });
  } catch (err) { next(err); }
});

userRouter.delete('/history/:videoId', async (req: AuthRequest, res, next) => {
  try {
    await prisma.watchHistory.deleteMany({ where: { userId: req.user!.id, videoId: req.params.videoId } });
    res.json({ success: true, message: 'Removed from history' });
  } catch (err) { next(err); }
});

userRouter.delete('/history', async (req: AuthRequest, res, next) => {
  try {
    await prisma.watchHistory.deleteMany({ where: { userId: req.user!.id } });
    res.json({ success: true, message: 'History cleared' });
  } catch (err) { next(err); }
});

userRouter.post('/history/pause', async (req: AuthRequest, res, next) => {
  try {
    // In production, toggle a setting in user preferences
    res.json({ success: true });
  } catch (err) { next(err); }
});

userRouter.get('/watch-later', async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.watchLater.findMany({
      where: { userId: req.user!.id },
      orderBy: { addedAt: 'desc' },
      include: { video: { include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true } } } } },
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

userRouter.post('/watch-later/:videoId', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.watchLater.findUnique({ where: { userId_videoId: { userId: req.user!.id, videoId: req.params.videoId } } });
    if (existing) {
      await prisma.watchLater.delete({ where: { id: existing.id } });
      return res.json({ success: true, data: { saved: false } });
    }
    await prisma.watchLater.create({ data: { userId: req.user!.id, videoId: req.params.videoId } });
    res.json({ success: true, data: { saved: true } });
  } catch (err) { next(err); }
});

userRouter.delete('/watch-later/:videoId', async (req: AuthRequest, res, next) => {
  try {
    await prisma.watchLater.deleteMany({ where: { userId: req.user!.id, videoId: req.params.videoId } });
    res.json({ success: true, message: 'Removed from Watch Later' });
  } catch (err) { next(err); }
});

userRouter.get('/liked-videos', async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.likedVideo.findMany({
      where: { userId: req.user!.id },
      orderBy: { addedAt: 'desc' },
      include: { video: { include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true } } } } },
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

userRouter.get('/playlists', async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const playlists = await prisma.playlist.findMany({
      where: { channelId: channel.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { videos: true } } },
    });
    res.json({ success: true, data: playlists });
  } catch (err) { next(err); }
});
