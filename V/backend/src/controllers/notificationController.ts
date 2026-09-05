import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId!,
        ...(unreadOnly === 'true' ? { isRead: false } : {}),
        OR: [
          { expiresAt: { gt: new Date() } },
          { expiresAt: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId!,
        isRead: false,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: req.userId!,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.userId!,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;

    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: req.userId!,
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.userId!,
        isRead: false,
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteOldNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const result = await prisma.notification.deleteMany({
      where: {
        userId: req.userId!,
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    logger.info(`Deleted ${result.count} old notifications for user ${req.userId}`);

    res.json({ deleted: result.count });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
