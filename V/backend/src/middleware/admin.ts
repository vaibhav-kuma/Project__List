import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import logger from '../config/logger';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
const MODERATOR_EMAILS = (process.env.MODERATOR_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, role: true },
    });

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).userRole = 'admin';
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, role: true },
    });

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    const isModerator =
      user.role === 'admin' ||
      user.role === 'moderator' ||
      ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') ||
      MODERATOR_EMAILS.includes(user.email?.toLowerCase() || '');

    if (!isModerator) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    (req as any).userRole = user.role === 'admin' ? 'admin' : 'moderator';
    next();
  } catch (error) {
    logger.error('Moderator middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireAdminOrModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, role: true },
    });

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
    const isModerator =
      user.role === 'moderator' || MODERATOR_EMAILS.includes(user.email?.toLowerCase() || '');

    if (!isAdmin && !isModerator) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    (req as any).userRole = isAdmin ? 'admin' : 'moderator';
    next();
  } catch (error) {
    logger.error('Admin/Moderator middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
