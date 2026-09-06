import { PrismaClient, Prisma } from '@prisma/client';
import { getCache } from '../services/cacheService';

const CACHE_TTL = {
  USER_PROFILE: 300,
  USER_PREFERENCES: 300,
  USER_FRIENDS: 60,
  USER_MOMENTS: 120,
  MATCH_HISTORY: 60,
  SUBSCRIPTION: 120,
  LEADERBOARD: 60,
  STATS: 120,
};

export class QueryOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private get cache() {
    return getCache();
  }

  async findUserById(id: string, useCache: boolean = true) {
    if (!useCache) {
      return this.prisma.user.findUnique({ where: { id } });
    }

    return this.cache.remember(
      `user:${id}`,
      () => this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true, displayName: true, email: true, age: true, gender: true,
          avatarUrl: true, bio: true, isVerified: true, status: true,
          role: true, isPremium: true, premiumTier: true, isBanned: true,
          isMinor: true, restrictedMode: true, createdAt: true,
        },
      }).then((user) => user || null),
      CACHE_TTL.USER_PROFILE
    );
  }

  async findUserWithPreferences(id: string) {
    return this.cache.remember(
      `user:${id}:prefs`,
      () => this.prisma.user.findUnique({
        where: { id },
        include: {
          preferences: true,
        },
      }),
      CACHE_TTL.USER_PREFERENCES
    );
  }

  async findActiveFriends(userId: string) {
    return this.cache.remember(
      `user:${userId}:friends:active`,
      () => this.prisma.friend.findMany({
        where: {
          OR: [
            { user1Id: userId, status: 'accepted' },
            { user2Id: userId, status: 'accepted' },
          ],
        },
        select: {
          id: true,
          user1: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
          user2: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
          status: true,
          lastChatAt: true,
        },
        orderBy: { lastChatAt: 'desc' },
        take: 100,
      }),
      CACHE_TTL.USER_FRIENDS
    );
  }

  async findRecentMoments(userId: string, limit: number = 20, offset: number = 0) {
    return this.cache.remember(
      `user:${userId}:moments:${limit}:${offset}`,
      () => this.prisma.moment.findMany({
        where: {
          userId,
          isExpired: false,
          moderationStatus: 'approved',
        },
        select: {
          id: true, mediaUrl: true, thumbnailUrl: true, mediaType: true,
          caption: true, viewCount: true, likeCount: true, replyCount: true,
          createdAt: true, expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      CACHE_TTL.USER_MOMENTS
    );
  }

  async findMatchesForUser(userId: string, limit: number = 50, offset: number = 0) {
    return this.cache.remember(
      `user:${userId}:matches:${limit}:${offset}`,
      () => this.prisma.matchHistory.findMany({
        where: {
          OR: [{ userId }, { matchedWith: userId }],
        },
        select: {
          id: true, matchedAt: true, durationSeconds: true, connected: true,
          addedAsFriend: true, matchType: true,
          user: { select: { id: true, displayName: true, avatarUrl: true } },
          partner: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { matchedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      CACHE_TTL.MATCH_HISTORY
    );
  }

  async findUserSubscription(userId: string) {
    return this.cache.remember(
      `user:${userId}:subscription`,
      () => this.prisma.subscription.findFirst({
        where: { userId, status: { in: ['active', 'trialing'] } },
        select: {
          id: true, plan: true, status: true, currentPeriodEnd: true,
          autoRenew: true, cancelAtPeriodEnd: true,
        },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
      CACHE_TTL.SUBSCRIPTION
    );
  }

  async findReportsQueue(status: string, limit: number = 20, offset: number = 0) {
    const cacheKey = `reports:${status}:${limit}:${offset}`;
    return this.cache.remember(
      cacheKey,
      () => this.prisma.report.findMany({
        where: { status: status as any },
        select: {
          id: true, reason: true, description: true, severity: true,
          priority: true, status: true, createdAt: true,
          reporter: { select: { id: true, displayName: true } },
          reportedUser: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: limit,
        skip: offset,
      }),
      CACHE_TTL.STATS
    );
  }

  async getSystemStats() {
    return this.cache.remember(
      'system:stats',
      async () => {
        const [
          totalUsers, activeUsers, totalSessions, totalReports,
          premiumUsers, bannedUsers,
        ] = await Promise.all([
          this.prisma.user.count(),
          this.prisma.user.count({ where: { status: 'online' } }),
          this.prisma.videoSession.count(),
          this.prisma.report.count({ where: { status: 'pending' } }),
          this.prisma.user.count({ where: { isPremium: true } }),
          this.prisma.user.count({ where: { isBanned: true } }),
        ]);

        return { totalUsers, activeUsers, totalSessions, totalReports, premiumUsers, bannedUsers };
      },
      CACHE_TTL.STATS
    );
  }

  async invalidateUserCache(userId: string) {
    const patterns = [
      `cache:user:${userId}`,
      `cache:user:${userId}:prefs`,
      `cache:user:${userId}:friends:*`,
      `cache:user:${userId}:moments:*`,
      `cache:user:${userId}:matches:*`,
    ];

    await Promise.all(patterns.map((p) => this.cache.delPattern(p)));
  }

  async invalidateGlobalCache() {
    await Promise.all([
      this.cache.delPattern('reports:*'),
      this.cache.del('system:stats'),
    ]);
  }

  static batchQueries<T>(items: T[], batchSize: number = 50): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async batchFindUsers(ids: string[]) {
    const batches = QueryOptimizer.batchQueries(ids, 50);
    const results: any[] = [];

    for (const batch of batches) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: batch } },
        select: {
          id: true, displayName: true, avatarUrl: true, status: true,
          isVerified: true, gender: true, age: true,
        },
      });
      results.push(...users);
    }

    return results;
  }
}

let queryOptimizerInstance: QueryOptimizer | null = null;

export function getQueryOptimizer(prisma: PrismaClient): QueryOptimizer {
  if (!queryOptimizerInstance) {
    queryOptimizerInstance = new QueryOptimizer(prisma);
  }
  return queryOptimizerInstance;
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    transactionOptions: {
      maxWait: 5000,
      timeout: 10000,
    },
  });
}
