import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';

export const requireRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const moderatorEmails = (process.env.MODERATOR_EMAILS || '').split(',').filter(Boolean);
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

      const userRoles: string[] = [];

      if (adminEmails.includes(user.email!)) {
        userRoles.push('admin');
      }

      if (moderatorEmails.includes(user.email!) || adminEmails.includes(user.email!)) {
        userRoles.push('moderator');
      }

      const hasRole = roles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
