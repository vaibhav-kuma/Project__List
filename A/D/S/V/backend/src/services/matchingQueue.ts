import redisClient from '../config/redis';
import prisma from '../config/database';
import logger from '../config/logger';

export interface MatchPreferences {
  userId: string;
  ageMin: number;
  ageMax: number;
  genders: string[];
  languages: string[];
  region?: string;
  interests?: string[];
  distanceKm?: number;
}

export interface QueuedUser {
  userId: string;
  age: number;
  gender: string;
  languages: string[];
  region: string;
  interests: string[];
  preferences: MatchPreferences;
  joinedAt: number;
  isPremium: boolean;
  premiumTier: string;
  connectionQuality: number;
}

export interface MatchResult {
  user1Id: string;
  user2Id: string;
  compatibilityScore: number;
  matchReason: string;
}

const MATCH_QUEUE_KEY = 'match:queue';
const USER_DATA_PREFIX = 'match:user:';
const COOLDOWN_PREFIX = 'match:cooldown:';
const REGION_QUEUE_PREFIX = 'match:region:';
const QUEUE_POSITION_PREFIX = 'match:position:';
const ACTIVE_SESSIONS_KEY = 'match:active:sessions';
const MATCH_STATS_KEY = 'match:stats';
const REWIND_PREFIX = 'match:rewind:';

const COOLDOWN_DURATION = 30 * 60;
const FREE_PRIORITY_BONUS = 0;
const PLUS_PRIORITY_BONUS = 150;
const PRO_PRIORITY_BONUS = 300;
const REGION_BONUS = 50;
const LANGUAGE_BONUS = 30;
const INTEREST_BONUS = 20;
const MAX_QUEUE_WAIT = 5 * 60 * 1000;
const MAX_FREE_DAILY_MATCHES = 10;

export class MatchingQueue {
  private matchLoopInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  async startMatchLoop(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    this.matchLoopInterval = setInterval(async () => {
      try {
        await this.processMatches();
      } catch (error) {
        logger.error('Match loop error:', error);
      }
    }, 500);

    this.matchLoopInterval.unref();
    logger.info('Match loop started');
  }

  stopMatchLoop(): void {
    if (this.matchLoopInterval) {
      clearInterval(this.matchLoopInterval);
      this.matchLoopInterval = null;
    }
    this.isRunning = false;
    logger.info('Match loop stopped');
  }

  async addToQueue(user: MatchPreferences): Promise<{ position: number; estimatedWait: number }> {
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        age: true,
        gender: true,
        isPremium: true,
        premiumTier: true,
        isBanned: true,
        status: true,
      },
    });

    if (!userData) {
      throw new Error('User not found');
    }

    if (userData.isBanned || userData.status === 'banned') {
      throw new Error('Account is banned');
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyMatches = await prisma.matchHistory.count({
      where: {
        userId: user.userId,
        matchedAt: { gte: new Date(today) },
      },
    });

    const features = await prisma.subscriptionFeature.findFirst({
      where: { plan: (userData.premiumTier || 'free') as any },
      select: { maxDailyMatches: true },
    });

    const maxDailyMatches = features?.maxDailyMatches || MAX_FREE_DAILY_MATCHES;
    if (dailyMatches >= maxDailyMatches && !userData.isPremium) {
      throw new Error(`Daily match limit reached (${maxDailyMatches}). Upgrade to Plus for unlimited matches.`);
    }

    const userKey = `${USER_DATA_PREFIX}${user.userId}`;
    const priorityBonus = userData.premiumTier === 'pro' ? PRO_PRIORITY_BONUS :
                         userData.premiumTier === 'plus' ? PLUS_PRIORITY_BONUS :
                         FREE_PRIORITY_BONUS;

    await redisClient.hSet(userKey, {
      userId: user.userId,
      age: String(userData.age),
      gender: userData.gender,
      languages: JSON.stringify(user.languages),
      interests: JSON.stringify(user.interests || []),
      region: user.region || 'global',
      ageMin: String(user.ageMin),
      ageMax: String(user.ageMax),
      genders: JSON.stringify(user.genders),
      joinedAt: String(Date.now()),
      isPremium: String(userData.isPremium),
      premiumTier: userData.premiumTier || 'free',
      connectionQuality: String(priorityBonus),
    });

    await redisClient.expire(userKey, 600);

    const score = Date.now() - (priorityBonus * 1000);
    await redisClient.zAdd(MATCH_QUEUE_KEY, [{ score, value: user.userId }]);

    const regionKey = `${REGION_QUEUE_PREFIX}${user.region || 'global'}`;
    await redisClient.zAdd(regionKey, [{ score, value: user.userId }]);
    await redisClient.expire(regionKey, 600);

    const position = await this.getQueuePosition(user.userId);
    const estimatedWait = this.estimateWaitTime(position);

    await redisClient.set(`${QUEUE_POSITION_PREFIX}${user.userId}`, String(position), { EX: 60 });

    logger.info(`User ${user.userId} (${userData.premiumTier}) added to queue at position ${position}`);

    return { position, estimatedWait };
  }

  async removeFromQueue(userId: string): Promise<void> {
    const userKey = `${USER_DATA_PREFIX}${userId}`;
    const userData = await redisClient.hGetAll(userKey);

    if (userData.userId) {
      const region = userData.region || 'global';
      const regionKey = `${REGION_QUEUE_PREFIX}${region}`;

      await Promise.all([
        redisClient.zRem(MATCH_QUEUE_KEY, userId),
        redisClient.zRem(regionKey, userId),
        redisClient.del(userKey),
        redisClient.del(`${QUEUE_POSITION_PREFIX}${userId}`),
      ]);
    }

    logger.info(`User ${userId} removed from queue`);
  }

  async getQueuePosition(userId: string): Promise<number> {
    const userKey = `${USER_DATA_PREFIX}${userId}`;
    const userData = await redisClient.hGetAll(userKey);

    if (!userData.userId) return -1;

    const region = userData.region || 'global';
    const regionKey = `${REGION_QUEUE_PREFIX}${region}`;

    const regionPosition = await redisClient.zRank(regionKey, userId);
    if (regionPosition !== null && regionPosition < 10) {
      return regionPosition + 1;
    }

    const globalPosition = await redisClient.zRank(MATCH_QUEUE_KEY, userId);
    return globalPosition !== null ? globalPosition + 1 : -1;
  }

  async getQueueSize(region?: string): Promise<number> {
    if (region) {
      const regionKey = `${REGION_QUEUE_PREFIX}${region}`;
      return await redisClient.zCard(regionKey);
    }
    return await redisClient.zCard(MATCH_QUEUE_KEY);
  }

  async getUserData(userId: string): Promise<QueuedUser | null> {
    const userKey = `${USER_DATA_PREFIX}${userId}`;
    const data = await redisClient.hGetAll(userKey);

    if (!data.userId) return null;

    return {
      userId: data.userId,
      age: parseInt(data.age),
      gender: data.gender,
      languages: JSON.parse(data.languages || '[]'),
      interests: JSON.parse(data.interests || '[]'),
      region: data.region || 'global',
      preferences: {
        userId: data.userId,
        ageMin: parseInt(data.ageMin),
        ageMax: parseInt(data.ageMax),
        genders: JSON.parse(data.genders || '[]'),
        languages: JSON.parse(data.languages || '[]'),
        region: data.region || 'global',
      },
      joinedAt: parseInt(data.joinedAt),
      isPremium: data.isPremium === 'true',
      premiumTier: data.premiumTier || 'free',
      connectionQuality: parseInt(data.connectionQuality),
    };
  }

  private async processMatches(): Promise<void> {
    const queueSize = await redisClient.zCard(MATCH_QUEUE_KEY);
    if (queueSize < 2) return;

    const users = await redisClient.zRange(MATCH_QUEUE_KEY, 0, 49);

    for (let i = 0; i < users.length - 1; i++) {
      const user1Id = users[i];
      const user1 = await this.getUserData(user1Id);
      if (!user1) continue;

      for (let j = i + 1; j < users.length; j++) {
        const user2Id = users[j];
        const user2 = await this.getUserData(user2Id);
        if (!user2) continue;

        const compatibility = await this.calculateCompatibility(user1, user2);
        if (compatibility.score >= 50) {
          await this.createMatch(user1, user2, compatibility);
          return;
        }
      }
    }

    await this.handleLongWaitUsers();
  }

  private async calculateCompatibility(user1: QueuedUser, user2: QueuedUser): Promise<{ score: number; reason: string }> {
    let score = 50;
    const reasons: string[] = [];

    const ageFilterEnabled = user1.premiumTier !== 'free' || user2.premiumTier !== 'free';
    if (!ageFilterEnabled) {
      if (user2.age < user1.preferences.ageMin || user2.age > user1.preferences.ageMax) {
        return { score: 0, reason: 'age_mismatch' };
      }
      if (user1.age < user2.preferences.ageMin || user1.age > user2.preferences.ageMax) {
        return { score: 0, reason: 'age_mismatch' };
      }
    }
    reasons.push('age_compatible');

    if (user1.preferences.genders.length > 0) {
      if (!user1.preferences.genders.includes(user2.gender)) {
        return { score: 0, reason: 'gender_mismatch' };
      }
    }
    if (user2.preferences.genders.length > 0) {
      if (!user2.preferences.genders.includes(user1.gender)) {
        return { score: 0, reason: 'gender_mismatch' };
      }
    }
    reasons.push('gender_compatible');

    const locationFilterEnabled = user1.premiumTier !== 'free' || user2.premiumTier !== 'free';
    if (locationFilterEnabled) {
      if (user1.region === user2.region && user1.region !== 'global') {
        score += REGION_BONUS;
        reasons.push('same_region');
      }
    } else {
      score += 10;
      reasons.push('global_match');
    }

    const commonLanguages = user1.languages.filter((lang) => user2.languages.includes(lang));
    if (commonLanguages.length > 0) {
      score += LANGUAGE_BONUS * commonLanguages.length;
      reasons.push(`common_language:${commonLanguages[0]}`);
    }

    const commonInterests = user1.interests.filter((i) => user2.interests.includes(i));
    if (commonInterests.length > 0) {
      score += INTEREST_BONUS * commonInterests.length;
      reasons.push(`common_interests:${commonInterests.length}`);
    }

    if (user1.premiumTier === 'plus' && user2.premiumTier === 'plus') {
      score += 25;
      reasons.push('both_plus');
    } else if (user1.premiumTier === 'pro' || user2.premiumTier === 'pro') {
      score += 35;
      reasons.push('pro_bonus');
    } else if (user1.isPremium || user2.isPremium) {
      score += 15;
      reasons.push('premium_bonus');
    }

    const inCooldown = await this.isInCooldown(user1.userId, user2.userId);
    if (inCooldown) {
      return { score: 0, reason: 'cooldown' };
    }

    const waitTime = Date.now() - Math.min(user1.joinedAt, user2.joinedAt);
    if (waitTime > 30000) {
      score += Math.min(20, Math.floor(waitTime / 10000));
      reasons.push('wait_bonus');
    }

    return { score: Math.min(100, score), reason: reasons.join(',') };
  }

  private async isInCooldown(userId1: string, userId2: string): Promise<boolean> {
    const cooldownKey1 = `${COOLDOWN_PREFIX}${userId1}:${userId2}`;
    const cooldownKey2 = `${COOLDOWN_PREFIX}${userId2}:${userId1}`;

    const [exists1, exists2] = await Promise.all([
      redisClient.exists(cooldownKey1),
      redisClient.exists(cooldownKey2),
    ]);

    return exists1 === 1 || exists2 === 1;
  }

  private async setCooldown(userId1: string, userId2: string): Promise<void> {
    const cooldownKey1 = `${COOLDOWN_PREFIX}${userId1}:${userId2}`;
    const cooldownKey2 = `${COOLDOWN_PREFIX}${userId2}:${userId1}`;

    await Promise.all([
      redisClient.set(cooldownKey1, '1', { EX: COOLDOWN_DURATION }),
      redisClient.set(cooldownKey2, '1', { EX: COOLDOWN_DURATION }),
    ]);
  }

  private async createMatch(
    user1: QueuedUser,
    user2: QueuedUser,
    compatibility: { score: number; reason: string }
  ): Promise<void> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      await tx.videoSession.create({
        data: {
          id: sessionId,
          user1Id: user1.userId,
          user2Id: user2.userId,
          status: 'connecting',
          maxDurationSeconds: 15,
        },
      });

      await tx.matchHistory.createMany({
        data: [
          {
            userId: user1.userId,
            matchedWith: user2.userId,
            sessionId,
            matchType: 'random',
            waitTimeSeconds: Math.floor((Date.now() - user1.joinedAt) / 1000),
          },
          {
            userId: user2.userId,
            matchedWith: user1.userId,
            sessionId,
            matchType: 'random',
            waitTimeSeconds: Math.floor((Date.now() - user2.joinedAt) / 1000),
          },
        ],
      });
    });

    await this.setCooldown(user1.userId, user2.userId);

    await redisClient.zRem(MATCH_QUEUE_KEY, user1.userId);
    await redisClient.zRem(MATCH_QUEUE_KEY, user2.userId);

    const region1 = user1.region || 'global';
    const region2 = user2.region || 'global';
    await Promise.all([
      redisClient.zRem(`${REGION_QUEUE_PREFIX}${region1}`, user1.userId),
      redisClient.zRem(`${REGION_QUEUE_PREFIX}${region2}`, user2.userId),
    ]);

    await Promise.all([
      redisClient.del(`${USER_DATA_PREFIX}${user1.userId}`),
      redisClient.del(`${USER_DATA_PREFIX}${user2.userId}`),
      redisClient.del(`${QUEUE_POSITION_PREFIX}${user1.userId}`),
      redisClient.del(`${QUEUE_POSITION_PREFIX}${user2.userId}`),
    ]);

    await redisClient.zAdd(ACTIVE_SESSIONS_KEY, [{ score: Date.now(), value: sessionId }]);
    await redisClient.expire(ACTIVE_SESSIONS_KEY, 3600);

    await redisClient.hSet(`session:${sessionId}`, {
      user1Id: user1.userId,
      user2Id: user2.userId,
      status: 'connecting',
      compatibilityScore: String(compatibility.score),
      matchReason: compatibility.reason,
      createdAt: String(Date.now()),
    });
    await redisClient.expire(`session:${sessionId}`, 3600);

    await this.incrementMatchStats();

    logger.info(`Match created: ${user1.userId} <-> ${user2.userId} (score: ${compatibility.score})`);
  }

  private async handleLongWaitUsers(): Promise<void> {
    const users = await redisClient.zRange(MATCH_QUEUE_KEY, 0, -1);

    for (const userId of users) {
      const userData = await this.getUserData(userId);
      if (!userData) continue;

      const waitTime = Date.now() - userData.joinedAt;
      if (waitTime > MAX_QUEUE_WAIT) {
        logger.info(`User ${userId} waited ${waitTime}ms, relaxing preferences`);

        const relaxedPreferences: MatchPreferences = {
          userId: userData.userId,
          ageMin: Math.max(18, userData.preferences.ageMin - 5),
          ageMax: Math.min(120, userData.preferences.ageMax + 5),
          genders: [],
          languages: userData.preferences.languages,
          region: 'global',
        };

        const userKey = `${USER_DATA_PREFIX}${userId}`;
        await redisClient.hSet(userKey, {
          ageMin: String(relaxedPreferences.ageMin),
          ageMax: String(relaxedPreferences.ageMax),
          genders: JSON.stringify(relaxedPreferences.genders),
          region: 'global',
        });
      }
    }
  }

  private estimateWaitTime(position: number): number {
    const avgMatchTime = 10;
    return position * avgMatchTime;
  }

  private async incrementMatchStats(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `${MATCH_STATS_KEY}:${today}`;

    await redisClient.hIncrBy(statsKey, 'total_matches', 1);
    await redisClient.expire(statsKey, 86400 * 7);
  }

  async getMatchStats(): Promise<{
    queueSize: number;
    activeSessions: number;
    todayMatches: number;
    avgWaitTime: number;
  }> {
    const queueSize = await redisClient.zCard(MATCH_QUEUE_KEY);
    const activeSessions = await redisClient.zCard(ACTIVE_SESSIONS_KEY);

    const today = new Date().toISOString().split('T')[0];
    const statsKey = `${MATCH_STATS_KEY}:${today}`;
    const stats = await redisClient.hGetAll(statsKey);

    return {
      queueSize,
      activeSessions,
      todayMatches: parseInt(stats.total_matches || '0'),
      avgWaitTime: parseInt(stats.avg_wait_time || '0'),
    };
  }

  async cleanupStaleUsers(): Promise<number> {
    const users = await redisClient.zRange(MATCH_QUEUE_KEY, 0, -1);
    let cleaned = 0;

    for (const userId of users) {
      const userData = await this.getUserData(userId);
      if (!userData) {
        await redisClient.zRem(MATCH_QUEUE_KEY, userId);
        cleaned++;
        continue;
      }

      if (Date.now() - userData.joinedAt > 600000) {
        await this.removeFromQueue(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} stale users from queue`);
    }

    return cleaned;
  }

  async getRecentMatches(userId: string, limit: number = 20): Promise<any[]> {
    const matches = await prisma.matchHistory.findMany({
      where: { userId },
      include: {
        partner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            age: true,
            gender: true,
          },
        },
      },
      orderBy: { matchedAt: 'desc' },
      take: limit,
    });

    return matches.map((m) => ({
      id: m.id,
      partner: m.partner,
      sessionId: m.sessionId,
      matchedAt: m.matchedAt,
      duration: m.durationSeconds,
      extended: m.extended,
      addedAsFriend: m.addedAsFriend,
    }));
  }

  async rewindMatch(userId: string, matchId: string): Promise<{ sessionId: string; partnerId: string } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumTier: true },
    });

    if (!user?.isPremium) {
      throw new Error('Rewind requires Plus subscription');
    }

    const features = await prisma.subscriptionFeature.findFirst({
      where: { plan: (user.premiumTier || 'free') as any },
      select: { rewindFeature: true, unlimitedRewinds: true },
    });

    if (!features?.rewindFeature) {
      throw new Error('Rewind feature not available in your plan');
    }

    const match = await prisma.matchHistory.findUnique({
      where: { id: matchId },
      select: { userId: true, matchedWith: true, sessionId: true },
    });

    if (!match || match.userId !== userId) {
      return null;
    }

    const rewindKey = `${REWIND_PREFIX}${userId}`;
    if (!features.unlimitedRewinds) {
      const rewindCount = await redisClient.hIncrBy(rewindKey, match.matchedWith, 1);
      await redisClient.expire(rewindKey, 86400);

      if (rewindCount > 3) {
        throw new Error('Rewind limit reached for this match today');
      }
    }

    const inCooldown = await this.isInCooldown(userId, match.matchedWith);
    if (inCooldown) {
      throw new Error('Cannot rewind: match is in cooldown');
    }

    const sessionId = `rewind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      await tx.videoSession.create({
        data: {
          id: sessionId,
          user1Id: userId,
          user2Id: match.matchedWith,
          status: 'connecting',
          maxDurationSeconds: 15,
        },
      });

      await tx.matchHistory.create({
        data: {
          userId,
          matchedWith: match.matchedWith,
          sessionId,
          matchType: 'rewind',
          connected: true,
        },
      });
    });

    logger.info(`Rewind match: ${userId} -> ${match.matchedWith}`);

    return { sessionId, partnerId: match.matchedWith };
  }

  async getWhoAddedAsFriend(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumTier: true },
    });

    if (!user?.isPremium) {
      throw new Error('This feature requires Plus subscription');
    }

    const features = await prisma.subscriptionFeature.findFirst({
      where: { plan: (user.premiumTier || 'free') as any },
      select: { seeWhoAddedAsFriend: true },
    });

    if (!features?.seeWhoAddedAsFriend) {
      throw new Error('Feature not available in your plan');
    }

    const friendRequests = await prisma.friend.findMany({
      where: {
        user2Id: userId,
        status: 'pending',
      },
      include: {
        user1: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            age: true,
            gender: true,
            isPremium: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendRequests.map((f) => ({
      id: f.id,
      user: f.user1,
      createdAt: f.createdAt,
    }));
  }
}
