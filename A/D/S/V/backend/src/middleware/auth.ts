import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        age: true,
        gender: true,
        avatarUrl: true,
        isVerified: true,
        isPremium: true,
        isBanned: true,
        banExpiresAt: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date())) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          phone: true,
          displayName: true,
          age: true,
          gender: true,
          avatarUrl: true,
          isVerified: true,
          isPremium: true,
          isBanned: true,
          status: true,
        },
      });

      if (user && !user.isBanned) {
        req.userId = decoded.userId;
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

export const requireVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isVerified) {
    return res.status(403).json({ error: 'Email/phone verification required' });
  }
  next();
};

export const requireAdult = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.age < 18) {
    return res.status(403).json({ error: 'This feature requires you to be 18 or older' });
  }
  next();
};
