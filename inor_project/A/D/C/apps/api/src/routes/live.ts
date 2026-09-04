import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const liveRouter = Router();

liveRouter.get('/active', async (req, res, next) => {
  try {
    // Placeholder for active streams
    res.json({ success: true, data: [] });
  } catch (err) { next(err); }
});

liveRouter.post('/create', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const streamKey = `live_${channel.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    res.json({
      success: true,
      data: {
        streamKey,
        rtmpUrl: process.env.RTMP_URL || 'rtmp://localhost:1935/live',
        streamId: streamKey,
      },
    });
  } catch (err) { next(err); }
});

liveRouter.get('/:streamId', async (req, res, next) => {
  try {
    res.json({ success: true, data: { id: req.params.streamId, status: 'offline', viewers: 0 } });
  } catch (err) { next(err); }
});
