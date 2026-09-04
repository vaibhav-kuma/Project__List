import { Router } from 'express';
import { prisma } from '@yt/database';
import { optionalAuth, authenticate, type AuthRequest } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';
import { search, indexVideo } from '../services/search';

export const searchRouter = Router();

searchRouter.get('/suggest', cacheMiddleware({ ttl: 60 }), async (req, res, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) return res.json({ suggestions: [] });

    const videos = await prisma.video.findMany({
      where: { status: 'PUBLISHED', title: { contains: q, mode: 'insensitive' } },
      select: { title: true },
      take: 5,
      orderBy: { views: 'desc' },
    });

    const suggestions = videos.map((v) => v.title);
    res.json({ suggestions });
  } catch (err) { next(err); }
});

searchRouter.get('/', optionalAuth, cacheMiddleware({ ttl: 120 }), async (req: AuthRequest, res, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    const type = (req.query.type as string) || 'all';
    const sort = (req.query.sort as string) || 'relevance';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

    if (!q) return res.json({ success: true, data: { videos: [], channels: [], playlists: [], totalResults: 0, searchTime: 0 } });

    const data = await search({
      q, type: type as any, sort: sort as any, page, limit, userId: req.user?.id,
    });

    if (req.user && q.length >= 2) {
      prisma.analyticsEvent.create({
        data: { event: 'search', userId: req.user.id, metadata: { query: q } },
      }).catch(() => {});
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

searchRouter.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const events = await prisma.analyticsEvent.findMany({
      where: { userId: req.user!.id, event: 'search' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const queries = events.map((e: any) => (e.metadata as any)?.query).filter(Boolean);
    const unique = [...new Set(queries)];
    res.json({ success: true, data: unique });
  } catch (err) { next(err); }
});

searchRouter.post('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.analyticsEvent.create({
      data: { event: 'search', userId: req.user!.id, metadata: { query: req.body.query } },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

searchRouter.delete('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.analyticsEvent.deleteMany({ where: { userId: req.user!.id, event: 'search' } });
    res.json({ success: true, message: 'Search history cleared' });
  } catch (err) { next(err); }
});
