import { requireAdmin, requireModerator, requireAdminOrModerator } from '../middleware/admin';
import { createMockRequest, createMockResponse, createMockNext } from './helpers';

jest.mock('../config/database', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

import prisma from '../config/database';
const mockPrisma = prisma as any;

describe('Admin Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAdmin', () => {
    it('should pass for admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com', role: 'admin' });
      const req = createMockRequest({ userId: 'admin-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject moderator users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'mod-1', email: 'mod@test.com', role: 'moderator' });
      const req = createMockRequest({ userId: 'mod-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject regular users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@test.com', role: 'user' });
      const req = createMockRequest({ userId: 'user-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject unauthenticated requests', async () => {
      const req = createMockRequest({ userId: undefined });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireModerator', () => {
    it('should pass for moderator users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'mod-1', email: 'mod@test.com', role: 'moderator' });
      const req = createMockRequest({ userId: 'mod-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireModerator(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should pass for admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com', role: 'admin' });
      const req = createMockRequest({ userId: 'admin-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireModerator(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdminOrModerator', () => {
    it('should pass for admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com', role: 'admin' });
      const req = createMockRequest({ userId: 'admin-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdminOrModerator(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should pass for moderator', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'mod-1', email: 'mod@test.com', role: 'moderator' });
      const req = createMockRequest({ userId: 'mod-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdminOrModerator(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject regular user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@test.com', role: 'user' });
      const req = createMockRequest({ userId: 'user-1' });
      const res = createMockResponse();
      const next = createMockNext();

      await requireAdminOrModerator(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
