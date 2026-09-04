import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const communityRouter = Router();

communityRouter.get('/channel/:channelId', async (req, res, next) => {
  try {
    const posts = await prisma.communityPost.findMany({
      where: { channelId: req.params.channelId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
});

communityRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const post = await prisma.communityPost.create({
      data: {
        channelId: channel.id,
        content: req.body.content,
        imageUrl: req.body.imageUrl,
      },
    });
    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
});
