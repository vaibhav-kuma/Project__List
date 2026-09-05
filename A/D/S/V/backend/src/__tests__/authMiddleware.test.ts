import { authenticate, optionalAuth, requireVerified, requireAdult } from '../middleware/auth';
import { createMockRequest, createMockResponse, createMockNext } from './helpers';

jest.mock('../config/database', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

jest.mock('jsonwebtoken', () => {
  class TokenExpiredError extends Error {
    name = 'TokenExpiredError';
    expiredAt: Date;
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.expiredAt = expiredAt;
    }
  }
  class JsonWebTokenError extends Error {
    name = 'JsonWebTokenError';
  }
  return {
    verify: jest.fn(),
    TokenExpiredError,
    JsonWebTokenError,
  };
});

import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const mockPrisma = prisma as any;

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should pass with valid token', async () => {
      const user = { id: 'user-1', role: 'user', isBanned: false, status: 'online' };
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user).toEqual(user);
      expect((req as any).userId).toBe('user-1');
    });

    it('should reject missing token', async () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid token'); });

      const req = createMockRequest({ headers: { authorization: 'Bearer bad-token' } });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject banned users', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'banned-user' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'banned-user', isBanned: true, banReason: 'Spam' });

      const req = createMockRequest({ headers: { authorization: 'Bearer token' } });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject non-existent users', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'ghost' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockRequest({ headers: { authorization: 'Bearer token' } });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    it('should pass without token', async () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeUndefined();
    });

    it('should attach user with valid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'user' });

      const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
    });

    it('should pass with invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('bad'); });

      const req = createMockRequest({ headers: { authorization: 'Bearer bad' } });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireVerified', () => {
    it('should pass for verified users', () => {
      const req = createMockRequest({ user: { isVerified: true } });
      const res = createMockResponse();
      const next = createMockNext();

      requireVerified(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject unverified users', () => {
      const req = createMockRequest({ user: { isVerified: false } });
      const res = createMockResponse();
      const next = createMockNext();

      requireVerified(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject missing user', () => {
      const req = createMockRequest({ user: undefined });
      const res = createMockResponse();
      const next = createMockNext();

      requireVerified(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdult', () => {
    it('should pass for users 18+', () => {
      const req = createMockRequest({ user: { age: 25 } });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdult(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject minors', () => {
      const req = createMockRequest({ user: { age: 16 } });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdult(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
