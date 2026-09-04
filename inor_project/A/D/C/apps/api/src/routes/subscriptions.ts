import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const subscriptionRouter = Router();

subscriptionRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { subscriberId: req.user!.id },
      include: {
        channel: { select: { id: true, name: true, handle: true, avatarUrl: true, subscriberCount: true, isVerified: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: subscriptions });
  } catch (err) { next(err); }
});

subscriptionRouter.post('/:channelId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const channelId = req.params.channelId;
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new AppError('Channel not found', 404);
    if (channel.userId === req.user!.id) throw new AppError('Cannot subscribe to yourself', 400);

    const existing = await prisma.subscription.findUnique({ where: { subscriberId_channelId: { subscriberId: req.user!.id, channelId } } });
    if (existing) throw new AppError('Already subscribed', 409);

    await prisma.$transaction([
      prisma.subscription.create({ data: { subscriberId: req.user!.id, channelId } }),
      prisma.channel.update({ where: { id: channelId }, data: { subscriberCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: channel.userId }, data: { subscriberCount: { increment: 1 } } }),
    ]);

    res.status(201).json({ success: true, message: 'Subscribed' });
  } catch (err) { next(err); }
});

subscriptionRouter.delete('/:channelId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const channelId = req.params.channelId;
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new AppError('Channel not found', 404);

    const existing = await prisma.subscription.findUnique({ where: { subscriberId_channelId: { subscriberId: req.user!.id, channelId } } });
    if (!existing) throw new AppError('Not subscribed', 404);

    await prisma.$transaction([
      prisma.subscription.delete({ where: { id: existing.id } }),
      prisma.channel.update({ where: { id: channelId }, data: { subscriberCount: { decrement: 1 } } }),
      prisma.user.update({ where: { id: channel.userId }, data: { subscriberCount: { decrement: 1 } } }),
    ]);

    res.json({ success: true, message: 'Unsubscribed' });
  } catch (err) { next(err); }
});

subscriptionRouter.patch('/:channelId/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sub = await prisma.subscription.update({
      where: { subscriberId_channelId: { subscriberId: req.user!.id, channelId: req.params.channelId } },
      data: { notifications: req.body.notifications },
    });
    res.json({ success: true, data: sub });
  } catch (err) { next(err); }
});
