import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { prisma } from '@yt/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      username: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else if (err instanceof AppError) {
      next(err);
    } else {
      next(new AppError('Invalid token', 401));
    }
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
        username: string;
        role: string;
      };
      req.user = decoded;
    }
  } catch {
    // Silently fail for optional auth
  }
  next();
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
}
