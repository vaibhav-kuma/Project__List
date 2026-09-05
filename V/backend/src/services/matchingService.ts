import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import redisClient from '../config/redis';
import logger from '../config/logger';
import { adminSocketService } from './adminSocketService';

const MATCH_QUEUE = 'match:queue';
const USER_PREFERENCES = 'user:preferences';
const USER_STATUS = 'user:status';
const SESSION_PREFIX = 'session:';

interface MatchPreferences {
  ageMin: number;
  ageMax: number;
  genders: string[];
  languages: string[];
}

interface QueuedUser {
  userId: string;
  preferences: MatchPreferences;
  joinedAt: number;
}

export class MatchingService {
  private io: Server;
  private queue: Map<string, QueuedUser> = new Map();
  private activeSessions: Map<string, { user1: string; user2: string }> = new Map();
  private matchCooldowns: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.startMatchLoop();
  }

  async addToQueue(userId: string, preferences: MatchPreferences): Promise<void> {
    await this.removeFromQueue(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { age: true, gender: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.age < preferences.ageMin || user.age > preferences.ageMax) {
      throw new Error('Age outside preferred range');
    }

    this.queue.set(userId, {
      userId,
      preferences,
      joinedAt: Date.now(),
    });

    await redisClient.hSet(`${USER_PREFERENCES}:${userId}`, {
      ageMin: String(preferences.ageMin),
      ageMax: String(preferences.ageMax),
      genders: JSON.stringify(preferences.genders),
      languages: JSON.stringify(preferences.languages),
    });

    await redisClient.set(`${USER_STATUS}:${userId}`, 'waiting');

    logger.info(`User ${userId} added to match queue`);
  }

  async removeFromQueue(userId: string): Promise<void> {
    this.queue.delete(userId);
    await redisClient.del(`${USER_STATUS}:${userId}`);
    await redisClient.del(`${USER_PREFERENCES}:${userId}`);
  }

  async findMatch(userId: string): Promise<string | null> {
    const user = this.queue.get(userId);
    if (!user) return null;

    const candidates = Array.from(this.queue.values())
      .filter((c) => c.userId !== userId)
      .filter((c) => !this.isInCooldown(userId, c.userId))
      .filter((c) => this.isCompatible(user, c));

    if (candidates.length === 0) return null;

    const match = candidates[0];
    return match.userId;
  }

  private isCompatible(user1: QueuedUser, user2: QueuedUser): boolean {
    const pref1 = user1.preferences;
    const pref2 = user2.preferences;

    if (pref1.genders.length > 0 && !pref1.genders.includes(pref2.genders[0] || '')) {
    }

    return true;
  }

  private isInCooldown(userId1: string, userId2: string): boolean {
    const cooldowns = this.matchCooldowns.get(userId1);
    return cooldowns?.has(userId2) || false;
  }

  private addToCooldown(userId1: string, userId2: string): void {
    if (!this.matchCooldowns.has(userId1)) {
      this.matchCooldowns.set(userId1, new Set());
    }
    this.matchCooldowns.get(userId1)!.add(userId2);

    if (!this.matchCooldowns.has(userId2)) {
      this.matchCooldowns.set(userId2, new Set());
    }
    this.matchCooldowns.get(userId2)!.add(userId1);

    setTimeout(() => {
      this.matchCooldowns.get(userId1)?.delete(userId2);
      this.matchCooldowns.get(userId2)?.delete(userId1);
    }, 30 * 60 * 1000);
  }

  async createSession(user1Id: string, user2Id: string): Promise<string> {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await prisma.videoSession.create({
      data: {
        id: sessionId,
        user1Id,
        user2Id,
        status: 'connecting',
      },
    });

    await prisma.matchHistory.createMany({
      data: [
        { userId: user1Id, matchedWith: user2Id, sessionId },
        { userId: user2Id, matchedWith: user1Id, sessionId },
      ],
    });

    this.activeSessions.set(sessionId, { user1: user1Id, user2: user2Id });
    this.addToCooldown(user1Id, user2Id);

    this.queue.delete(user1Id);
    this.queue.delete(user2Id);

    await redisClient.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify({
      user1: user1Id,
      user2: user2Id,
      status: 'connecting',
      createdAt: Date.now(),
    }), { EX: 3600 });

    await redisClient.set(`${USER_STATUS}:${user1Id}`, 'in_session');
    await redisClient.set(`${USER_STATUS}:${user2Id}`, 'in_session');

    this.io.to(user1Id).emit('match_found', {
      sessionId,
      matchedWith: user2Id,
    });

    this.io.to(user2Id).emit('match_found', {
      sessionId,
      matchedWith: user1Id,
    });

    adminSocketService.emitMatchCreated({
      sessionId,
      user1Id,
      user2Id,
    });

    logger.info(`Session ${sessionId} created: ${user1Id} <-> ${user2Id}`);

    return sessionId;
  }

  async startSession(sessionId: string): Promise<void> {
    await prisma.videoSession.update({
      where: { id: sessionId },
      data: { status: 'active' },
    });

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.io.to(session.user1).emit('session_started', {
      sessionId,
      duration: 15,
    });

    this.io.to(session.user2).emit('session_started', {
      sessionId,
      duration: 15,
    });

    await redisClient.set(`${SESSION_PREFIX}${sessionId}:started`, Date.now().toString(), { EX: 1800 });
  }

  async requestExtend(sessionId: string, userId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    const key = `${SESSION_PREFIX}${sessionId}:extend`;
    await redisClient.sAdd(key, userId);

    const members = await redisClient.sMembers(key);
    const otherUserId = session.user1 === userId ? session.user2 : session.user1;

    if (members.length === 2) {
      await prisma.videoSession.update({
        where: { id: sessionId },
        data: { extended: true, extendCount: { increment: 1 } },
      });

      this.io.to(session.user1).emit('session_extended', { sessionId });
      this.io.to(session.user2).emit('session_extended', { sessionId });

      await redisClient.set(`${SESSION_PREFIX}${sessionId}:started`, Date.now().toString(), { EX: 1800 });

      logger.info(`Session ${sessionId} extended by both users`);
      return true;
    }

    this.io.to(otherUserId).emit('extend_requested', {
      sessionId,
      requestedBy: userId,
    });

    return false;
  }

  async endSession(sessionId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const startTime = await redisClient.get(`${SESSION_PREFIX}${sessionId}:started`);
    const duration = startTime ? Math.floor((Date.now() - parseInt(startTime)) / 1000) : 0;

    await prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        endedAt: new Date(),
        durationSeconds: duration,
      },
    });

    await prisma.user.updateMany({
      where: { id: { in: [session.user1, session.user2] } },
      data: { totalSessions: { increment: 1 } },
    });

    await redisClient.del(`${SESSION_PREFIX}${sessionId}`);
    await redisClient.del(`${SESSION_PREFIX}${sessionId}:started`);
    await redisClient.del(`${SESSION_PREFIX}${sessionId}:extend`);
    await redisClient.del(`${USER_STATUS}:${session.user1}`);
    await redisClient.del(`${USER_STATUS}:${session.user2}`);

    this.activeSessions.delete(sessionId);

    this.io.to(session.user1).emit('session_ended', { sessionId, duration });
    this.io.to(session.user2).emit('session_ended', { sessionId, duration });
  }

  async handleSignal(sessionId: string, fromUserId: string, signal: any, targetUserId: string): Promise<void> {
    this.io.to(targetUserId).emit('webrtc_signal', {
      sessionId,
      signal,
      fromUserId,
    });
  }

  private startMatchLoop(): void {
    const matchInterval = setInterval(async () => {
      if (this.queue.size < 2) return;

      const users = Array.from(this.queue.keys());

      for (let i = 0; i < users.length; i++) {
        const userId = users[i];
        if (!this.queue.has(userId)) continue;

        const matchId = await this.findMatch(userId);
        if (matchId) {
          await this.createSession(userId, matchId);
          break;
        }
      }
    }, 1000);

    matchInterval.unref();
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  getActiveSessions(): number {
    return this.activeSessions.size;
  }
}
