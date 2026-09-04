import { Router } from 'express';
import { prisma } from '@yt/database';
import { optionalAuth, authenticate, type AuthRequest } from '../middleware/auth';

export const shortsRouter = Router();

shortsRouter.get('/feed', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

    const shorts = await prisma.video.findMany({
      where: { isShort: true, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        channel: { select: { id: true, name: true, handle: true, avatarUrl: true, subscriberCount: true, isVerified: true } },
      },
    });

    res.json({ success: true, data: shorts });
  } catch (err) { next(err); }
});

shortsRouter.get('/:id', async (req, res, next) => {
  try {
    const short = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: { channel: { select: { id: true, name: true, handle: true, avatarUrl: true, subscriberCount: true, isVerified: true } } },
    });
    if (!short || !short.isShort) return res.status(404).json({ success: false, error: 'Short not found' });
    res.json({ success: true, data: short });
  } catch (err) { next(err); }
});
