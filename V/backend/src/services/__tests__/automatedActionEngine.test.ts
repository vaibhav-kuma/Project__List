import { AutomatedActionEngine } from '../automatedActionEngine';

jest.mock('../../config/database', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  report: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  moderationAction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  videoSession: {
    updateMany: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../emailService', () => ({
  emailService: {
    sendModerationEmail: jest.fn().mockResolvedValue(true),
    sendAppealStatusEmail: jest.fn().mockResolvedValue(true),
  },
}));

const mockPrisma = require('../../config/database');
const mockEmailService = require('../emailService');

describe('AutomatedActionEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processViolation', () => {
    it('should issue warning for first strike', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        severityScore: 0,
        isBanned: false,
        totalReportsReceived: 0,
      });

      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await AutomatedActionEngine.processViolation(
        'user-1',
        'inappropriate content',
        3,
        'session-1'
      );

      expect(result.action).toBe('warning');
      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: 'warning',
            userId: 'user-1',
          }),
        })
      );
    });

    it('should issue temporary ban for second strike', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        severityScore: 3,
        isBanned: false,
        totalReportsReceived: 1,
      });

      mockPrisma.moderationAction.count.mockResolvedValue(1);
      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await AutomatedActionEngine.processViolation(
        'user-1',
        'harassment',
        5,
        'session-1'
      );

      expect(result.action).toBe('temporary_ban');
    });

    it('should issue permanent ban for severe violation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        severityScore: 0,
        isBanned: false,
        totalReportsReceived: 0,
      });

      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await AutomatedActionEngine.processViolation(
        'user-1',
        'underage',
        10,
        'session-1'
      );

      expect(result.action).toBe('permanent_ban');
    });

    it('should return none for minor first violation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        severityScore: 0,
        isBanned: false,
        totalReportsReceived: 0,
      });

      mockPrisma.moderationAction.count.mockResolvedValue(0);

      const result = await AutomatedActionEngine.processViolation(
        'user-1',
        'spam',
        1,
        'session-1'
      );

      expect(result.action).toBe('none');
    });
  });

  describe('executeAction', () => {
    it('should execute temporary ban with correct duration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        displayName: 'Test User',
      });

      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.videoSession.updateMany.mockResolvedValue({});

      const result = await AutomatedActionEngine.executeAction(
        'user-1',
        'temporary_ban',
        'Repeated violations',
        'session-1'
      );

      expect(result.action).toBe('temporary_ban');
      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: 'temporary_ban',
            durationHours: 24,
          }),
        })
      );
    });

    it('should execute permanent ban', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        displayName: 'Test User',
      });

      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await AutomatedActionEngine.executeAction(
        'user-1',
        'permanent_ban',
        'Severe policy violation'
      );

      expect(result.action).toBe('permanent_ban');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBanned: true,
            banExpiresAt: null,
          }),
        })
      );
    });

    it('should send email notification on action', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        displayName: 'Test User',
      });

      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});

      await AutomatedActionEngine.executeAction(
        'user-1',
        'warning',
        'First warning'
      );

      expect(mockEmailService.emailService.sendModerationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'warning',
        'First warning',
        undefined
      );
    });
  });

  describe('handleMLViolation', () => {
    it('should auto-ban for high confidence ML detection', async () => {
      mockPrisma.report.create.mockResolvedValue({ id: 'report-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        displayName: 'Test User',
      });
      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.videoSession.updateMany.mockResolvedValue({});

      const result = await AutomatedActionEngine.handleMLViolation(
        'user-1',
        'session-1',
        'nudity',
        0.96
      );

      expect(result.action).toBe('temporary_ban');
    });

    it('should flag for review for moderate confidence', async () => {
      mockPrisma.report.create.mockResolvedValue({ id: 'report-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        displayName: 'Test User',
        severityScore: 0,
        isBanned: false,
        totalReportsReceived: 0,
      });
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });

      const result = await AutomatedActionEngine.handleMLViolation(
        'user-1',
        'session-1',
        'violence',
        0.82
      );

      expect(result.action).toBeTruthy();
    });
  });

  describe('getStrikeInfo', () => {
    it('should return strike information', async () => {
      const mockStrikes = [
        {
          id: 'strike-1',
          reason: 'Inappropriate content',
          actionType: 'warning',
          createdAt: new Date(),
          expiresAt: null,
        },
      ];

      mockPrisma.moderationAction.findMany.mockResolvedValue(mockStrikes);

      const result = await AutomatedActionEngine.getStrikeInfo('user-1');

      expect(result.strikeCount).toBe(1);
      expect(result.strikes).toHaveLength(1);
      expect(result.nextAction).toBe('temporary_ban');
    });

    it('should indicate permanent ban for 4+ strikes', async () => {
      const mockStrikes = Array(4).fill({
        id: 'strike-1',
        reason: 'Violation',
        actionType: 'temporary_ban',
        createdAt: new Date(),
        expiresAt: null,
      });

      mockPrisma.moderationAction.findMany.mockResolvedValue(mockStrikes);

      const result = await AutomatedActionEngine.getStrikeInfo('user-1');

      expect(result.strikeCount).toBe(4);
      expect(result.nextAction).toBe('permanent_ban');
    });
  });

  describe('liftExpiredBans', () => {
    it('should lift expired bans', async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await AutomatedActionEngine.liftExpiredBans();

      expect(result).toBe(2);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBanned: true,
            banExpiresAt: expect.any(Object),
          }),
          data: expect.objectContaining({
            isBanned: false,
            banReason: null,
            banExpiresAt: null,
          }),
        })
      );
    });
  });

  describe('getUserModerationHistory', () => {
    it('should return complete moderation history', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({ severityScore: 5 });

      const result = await AutomatedActionEngine.getUserModerationHistory('user-1');

      expect(result).toHaveProperty('strikes');
      expect(result).toHaveProperty('reports');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('severityScore');
    });
  });
});
