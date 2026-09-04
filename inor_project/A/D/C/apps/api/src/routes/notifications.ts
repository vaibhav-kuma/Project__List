import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.id } }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

notificationRouter.post('/mark-read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { ids, all } = req.body;
    if (all) {
      await prisma.notification.updateMany({ where: { userId: req.user!.id }, data: { isRead: true } });
    } else if (Array.isArray(ids)) {
      await prisma.notification.updateMany({ where: { id: { in: ids }, userId: req.user!.id }, data: { isRead: true } });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

notificationRouter.patch('/settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { type, enabled } = req.body;
    res.json({ success: true });
  } catch (err) { next(err); }
});
