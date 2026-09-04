import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [totalUsers, totalVideos, totalViews, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.video.aggregate({ _sum: { views: true } }),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 86400000) } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVideos,
        totalViews: totalViews._sum.views?.toString() || '0',
        activeUsers24h: activeUsers,
      },
    });
  } catch (err) { next(err); }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, username: true, role: true, isVerified: true, createdAt: true, lastLoginAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

adminRouter.get('/videos', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { channel: { select: { name: true, handle: true } } },
      }),
      prisma.video.count({ where }),
    ]);

    res.json({
      success: true,
      data: videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

adminRouter.get('/reports', async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { reporter: { select: { id: true, username: true } } },
    });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});
