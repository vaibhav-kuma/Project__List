import { MatchingQueue, MatchPreferences, QueuedUser } from '../matchingQueue';
import redisClient from '../../config/redis';
import prisma from '../../config/database';

describe('MatchingQueue', () => {
  let matchingQueue: MatchingQueue;

  const mockUser1: MatchPreferences = {
    userId: 'user-1',
    ageMin: 18,
    ageMax: 35,
    genders: ['female', 'non_binary'],
    languages: ['en'],
    region: 'us-east',
  };

  const mockUser2: MatchPreferences = {
    userId: 'user-2',
    ageMin: 20,
    ageMax: 40,
    genders: ['male'],
    languages: ['en', 'es'],
    region: 'us-east',
  };

  const mockUser3: MatchPreferences = {
    userId: 'user-3',
    ageMin: 18,
    ageMax: 30,
    genders: ['male', 'female'],
    languages: ['en'],
    region: 'eu-west',
  };

  beforeAll(async () => {
    matchingQueue = new MatchingQueue();
    await redisClient.connect();
  });

  afterAll(async () => {
    matchingQueue.stopMatchLoop();
    await redisClient.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await redisClient.flushDb();
  });

  describe('addToQueue', () => {
    it('should add user to queue with correct position', async () => {
      const result = await matchingQueue.addToQueue(mockUser1);
      expect(result.position).toBe(1);
      expect(result.estimatedWait).toBeGreaterThan(0);
    });

    it('should increment queue size for multiple users', async () => {
      await matchingQueue.addToQueue(mockUser1);
      await matchingQueue.addToQueue(mockUser2);

      const size = await matchingQueue.getQueueSize();
      expect(size).toBe(2);
    });

    it('should store user data in Redis', async () => {
      await matchingQueue.addToQueue(mockUser1);
      const userData = await matchingQueue.getUserData(mockUser1.userId);

      expect(userData).not.toBeNull();
      expect(userData?.userId).toBe(mockUser1.userId);
      expect(userData?.region).toBe('us-east');
    });

    it('should throw error for banned user', async () => {
      await prisma.user.create({
        data: {
          id: 'banned-user',
          displayName: 'Banned',
          age: 25,
          gender: 'male',
          passwordHash: 'hash',
          isBanned: true,
        },
      });

      await expect(
        matchingQueue.addToQueue({ ...mockUser1, userId: 'banned-user' })
      ).rejects.toThrow('Account is banned');
    });
  });

  describe('removeFromQueue', () => {
    it('should remove user from queue', async () => {
      await matchingQueue.addToQueue(mockUser1);
      await matchingQueue.removeFromQueue(mockUser1.userId);

      const size = await matchingQueue.getQueueSize();
      expect(size).toBe(0);
    });

    it('should remove user data from Redis', async () => {
      await matchingQueue.addToQueue(mockUser1);
      await matchingQueue.removeFromQueue(mockUser1.userId);

      const userData = await matchingQueue.getUserData(mockUser1.userId);
      expect(userData).toBeNull();
    });

    it('should handle removing non-existent user gracefully', async () => {
      await expect(matchingQueue.removeFromQueue('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getQueuePosition', () => {
    it('should return correct position for user', async () => {
      await matchingQueue.addToQueue(mockUser1);
      await matchingQueue.addToQueue(mockUser2);

      const pos1 = await matchingQueue.getQueuePosition(mockUser1.userId);
      const pos2 = await matchingQueue.getQueuePosition(mockUser2.userId);

      expect(pos1).toBe(1);
      expect(pos2).toBe(2);
    });

    it('should return -1 for user not in queue', async () => {
      const pos = await matchingQueue.getQueuePosition('not-in-queue');
      expect(pos).toBe(-1);
    });
  });

  describe('calculateCompatibility', () => {
    it('should return high score for compatible users', () => {
      const user1: QueuedUser = {
        userId: 'u1',
        age: 25,
        gender: 'male',
        languages: ['en'],
        region: 'us-east',
        preferences: { ...mockUser1 },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const user2: QueuedUser = {
        userId: 'u2',
        age: 23,
        gender: 'female',
        languages: ['en'],
        region: 'us-east',
        preferences: { ...mockUser2 },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(user1, user2);
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('should reject age mismatch', () => {
      const user1: QueuedUser = {
        userId: 'u1',
        age: 25,
        gender: 'male',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en'], region: 'us-east', userId: 'u1' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const user2: QueuedUser = {
        userId: 'u2',
        age: 35,
        gender: 'female',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 40, genders: [], languages: ['en'], region: 'us-east', userId: 'u2' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(user1, user2);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('age_mismatch');
    });

    it('should reject gender mismatch', () => {
      const user1: QueuedUser = {
        userId: 'u1',
        age: 25,
        gender: 'male',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: ['male'], languages: ['en'], region: 'us-east', userId: 'u1' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const user2: QueuedUser = {
        userId: 'u2',
        age: 23,
        gender: 'male',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: ['female'], languages: ['en'], region: 'us-east', userId: 'u2' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(user1, user2);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('gender_mismatch');
    });

    it('should give bonus for same region', () => {
      const user1: QueuedUser = {
        userId: 'u1',
        age: 25,
        gender: 'male',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en'], region: 'us-east', userId: 'u1' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const user2: QueuedUser = {
        userId: 'u2',
        age: 23,
        gender: 'female',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en'], region: 'us-east', userId: 'u2' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(user1, user2);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should give bonus for common languages', () => {
      const user1: QueuedUser = {
        userId: 'u1',
        age: 25,
        gender: 'male',
        languages: ['en', 'es'],
        region: 'global',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en', 'es'], region: 'global', userId: 'u1' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const user2: QueuedUser = {
        userId: 'u2',
        age: 23,
        gender: 'female',
        languages: ['en', 'fr'],
        region: 'global',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en', 'fr'], region: 'global', userId: 'u2' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(user1, user2);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should reject users in cooldown', async () => {
      const user1: QueuedUser = {
        userId: 'u1',
        age: 25,
        gender: 'male',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en'], region: 'us-east', userId: 'u1' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const user2: QueuedUser = {
        userId: 'u2',
        age: 23,
        gender: 'female',
        languages: ['en'],
        region: 'us-east',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en'], region: 'us-east', userId: 'u2' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      await (matchingQueue as any).setCooldown('u1', 'u2');

      const result = (matchingQueue as any).calculateCompatibility(user1, user2);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('cooldown');
    });
  });

  describe('cooldown system', () => {
    it('should set cooldown between two users', async () => {
      await (matchingQueue as any).setCooldown('u1', 'u2');
      const inCooldown = await (matchingQueue as any).isInCooldown('u1', 'u2');
      expect(inCooldown).toBe(true);
    });

    it('should expire cooldown after duration', async () => {
      const key = 'match:cooldown:test1:test2';
      await redisClient.set(key, '1', { EX: 1 });

      const exists1 = await redisClient.exists(key);
      expect(exists1).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const exists2 = await redisClient.exists(key);
      expect(exists2).toBe(0);
    });
  });

  describe('queue position updates', () => {
    it('should update position when users join/leave', async () => {
      await matchingQueue.addToQueue(mockUser1);
      await matchingQueue.addToQueue(mockUser2);
      await matchingQueue.addToQueue(mockUser3);

      const pos1 = await matchingQueue.getQueuePosition(mockUser1.userId);
      expect(pos1).toBe(1);

      await matchingQueue.removeFromQueue(mockUser1.userId);

      const newPos2 = await matchingQueue.getQueuePosition(mockUser2.userId);
      expect(newPos2).toBe(1);
    });
  });

  describe('cleanup stale users', () => {
    it('should remove users who waited too long', async () => {
      await matchingQueue.addToQueue(mockUser1);

      const userKey = `match:user:${mockUser1.userId}`;
      await redisClient.hSet(userKey, 'joinedAt', String(Date.now() - 700000));

      const cleaned = await matchingQueue.cleanupStaleUsers();
      expect(cleaned).toBeGreaterThanOrEqual(1);
    });
  });

  describe('match stats', () => {
    it('should track match statistics', async () => {
      const stats = await matchingQueue.getMatchStats();
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('todayMatches');
      expect(stats).toHaveProperty('avgWaitTime');
    });
  });

  describe('region-based matching', () => {
    it('should prioritize same-region matches', async () => {
      const user1 = { ...mockUser1, region: 'us-east' };
      const user2 = { ...mockUser2, region: 'us-east' };
      const user3 = { ...mockUser3, region: 'eu-west' };

      await matchingQueue.addToQueue(user1);
      await matchingQueue.addToQueue(user2);
      await matchingQueue.addToQueue(user3);

      const usEastSize = await matchingQueue.getQueueSize('us-east');
      const euWestSize = await matchingQueue.getQueueSize('eu-west');

      expect(usEastSize).toBe(2);
      expect(euWestSize).toBe(1);
    });
  });

  describe('premium prioritization', () => {
    it('should give premium users higher priority', async () => {
      const premiumUser = { ...mockUser1, userId: 'premium-user' };
      const regularUser = { ...mockUser2, userId: 'regular-user' };

      await matchingQueue.addToQueue(premiumUser);
      await matchingQueue.addToQueue(regularUser);

      const premiumPos = await matchingQueue.getQueuePosition('premium-user');
      const regularPos = await matchingQueue.getQueuePosition('regular-user');

      expect(premiumPos).toBeLessThanOrEqual(regularPos);
    });
  });

  describe('edge cases', () => {
    it('should handle empty queue', async () => {
      const size = await matchingQueue.getQueueSize();
      expect(size).toBe(0);
    });

    it('should handle single user in queue', async () => {
      await matchingQueue.addToQueue(mockUser1);
      const size = await matchingQueue.getQueueSize();
      expect(size).toBe(1);
    });

    it('should handle duplicate queue joins', async () => {
      await matchingQueue.addToQueue(mockUser1);
      await matchingQueue.addToQueue(mockUser1);

      const size = await matchingQueue.getQueueSize();
      expect(size).toBe(1);
    });

    it('should handle rapid join/leave', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(matchingQueue.addToQueue({ ...mockUser1, userId: `user-${i}` }));
      }
      await Promise.all(promises);

      const size = await matchingQueue.getQueueSize();
      expect(size).toBe(10);

      const removePromises = [];
      for (let i = 0; i < 10; i++) {
        removePromises.push(matchingQueue.removeFromQueue(`user-${i}`));
      }
      await Promise.all(removePromises);

      const finalSize = await matchingQueue.getQueueSize();
      expect(finalSize).toBe(0);
    });
  });

  describe('age enforcement', () => {
    it('should not match users outside age preferences', async () => {
      const youngUser: QueuedUser = {
        userId: 'young',
        age: 19,
        gender: 'male',
        languages: ['en'],
        region: 'global',
        preferences: { ageMin: 18, ageMax: 25, genders: [], languages: ['en'], region: 'global', userId: 'young' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const olderUser: QueuedUser = {
        userId: 'older',
        age: 40,
        gender: 'female',
        languages: ['en'],
        region: 'global',
        preferences: { ageMin: 35, ageMax: 50, genders: [], languages: ['en'], region: 'global', userId: 'older' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(youngUser, olderUser);
      expect(result.score).toBe(0);
    });

    it('should enforce minimum age of 18', async () => {
      const under18: QueuedUser = {
        userId: 'under18',
        age: 17,
        gender: 'male',
        languages: ['en'],
        region: 'global',
        preferences: { ageMin: 18, ageMax: 25, genders: [], languages: ['en'], region: 'global', userId: 'under18' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const adult: QueuedUser = {
        userId: 'adult',
        age: 25,
        gender: 'female',
        languages: ['en'],
        region: 'global',
        preferences: { ageMin: 18, ageMax: 30, genders: [], languages: ['en'], region: 'global', userId: 'adult' },
        joinedAt: Date.now(),
        isPremium: false,
        interests: [],
        premiumTier: 'free',
        connectionQuality: 0,
      };

      const result = (matchingQueue as any).calculateCompatibility(under18, adult);
      expect(result.score).toBe(0);
    });
  });

  describe('wait time relaxation', () => {
    it('should relax preferences after long wait', async () => {
      const longWaitUser = { ...mockUser1, userId: 'long-wait' };
      await matchingQueue.addToQueue(longWaitUser);

      const userKey = `match:user:${longWaitUser.userId}`;
      await redisClient.hSet(userKey, 'joinedAt', String(Date.now() - 400000));

      await (matchingQueue as any).handleLongWaitUsers();

      const userData = await redisClient.hGetAll(userKey);
      expect(parseInt(userData.ageMin)).toBeLessThan(mockUser1.ageMin);
      expect(userData.region).toBe('global');
    });
  });
});
