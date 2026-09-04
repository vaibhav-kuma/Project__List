import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const period = (req.query.period as string) || '28d';
    const days = parseInt(period.replace('d', '')) || 28;
    const since = new Date(Date.now() - days * 86400000);

    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const [totalViews, totalVideos] = await Promise.all([
      prisma.video.aggregate({ where: { channelId: channel.id }, _sum: { views: true } }),
      prisma.video.count({ where: { channelId: channel.id } }),
    ]);

    // Count watch_time events as proxy for total watch time
    const watchTimeEvents = await prisma.analyticsEvent.count({
      where: { videoId: { not: null }, createdAt: { gte: since }, event: 'watch_time' },
    });

    res.json({
      success: true,
      data: {
        totalViews: totalViews._sum.views?.toString() || '0',
        totalVideos,
        totalWatchTime: watchTimeEvents,
        subscribers: channel.subscriberCount,
        period: { start: since, end: new Date(), days },
      },
    });
  } catch (err) { next(err); }
});

analyticsRouter.get('/realtime', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const since = new Date(Date.now() - 48 * 3600000);
    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, event: 'view' },
      orderBy: { createdAt: 'asc' },
    });

    const hourly: Record<string, number> = {};
    events.forEach((e) => {
      const hour = new Date(e.createdAt).toISOString().substring(0, 13);
      hourly[hour] = (hourly[hour] || 0) + 1;
    });

    res.json({ success: true, data: { hourly, total: events.length } });
  } catch (err) { next(err); }
});

analyticsRouter.get('/video/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) throw new AppError('Video not found', 404);

    const commentsCount = await prisma.comment.count({ where: { videoId: video.id } });

    res.json({
      success: true,
      data: {
        views: video.views.toString(),
        likes: video.likes,
        dislikes: video.dislikes,
        comments: commentsCount,
        averageViewDuration: 0,
      },
    });
  } catch (err) { next(err); }
});
