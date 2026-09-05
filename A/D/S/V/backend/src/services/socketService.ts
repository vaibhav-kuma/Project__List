import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';
import { MatchingQueue, MatchPreferences } from '../services/matchingQueue';
import { setIOInstance } from '../controllers/friendController';
import { setNotificationIO, NotificationService } from '../services/notificationService';
import { setModerationIO, AutomatedActionEngine } from '../services/automatedActionEngine';
import { realTimeModeration } from '../services/realTimeModeration';
import { adminSocketService } from '../services/adminSocketService';
import prisma from '../config/database';

interface SignalData {
  sessionId: string;
  signal: any;
  targetUserId: string;
}

export const setupSocketIO = (io: Server) => {
  const matchingQueue = new MatchingQueue();

  setIOInstance(io);
  setNotificationIO(io);
  setModerationIO(io);
  realTimeModeration.initialize(io);
  adminSocketService.initialize(io);

  matchingQueue.startMatchLoop();

  setInterval(async () => {
    try {
      await matchingQueue.cleanupStaleUsers();
      await NotificationService.cleanupExpired();
      await AutomatedActionEngine.liftExpiredBans();
      await AutomatedActionEngine.liftExpiredRestrictions();
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }, 60000);

  setInterval(async () => {
    try {
      await NotificationService.cleanupOld();
    } catch (error) {
      logger.error('Notification cleanup error:', error);
    }
  }, 24 * 60 * 60 * 1000);

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, banReason: true, banExpiresAt: true, isShadowBanned: true },
    });

    if (user?.isBanned) {
      if (user.banExpiresAt && user.banExpiresAt < new Date()) {
        await prisma.user.update({
          where: { id: userId },
          data: { isBanned: false, banReason: null, banExpiresAt: null },
        });
      } else {
        socket.emit('account_banned', {
          reason: user.banReason,
          expiresAt: user.banExpiresAt,
        });
        socket.disconnect(true);
        return;
      }
    }

    socket.join(userId);

    realTimeModeration.registerSocket(userId, socket);

    const previousUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'online', lastActiveAt: new Date() },
    });

    if (previousUser?.status !== 'online') {
      const friends = await prisma.friend.findMany({
        where: {
          OR: [
            { user1Id: userId, status: 'accepted' },
            { user2Id: userId, status: 'accepted' },
          ],
        },
        select: {
          user1Id: true,
          user2Id: true,
        },
      });

      const friendIds = friends.map((f) =>
        f.user1Id === userId ? f.user2Id : f.user1Id
      );

      for (const friendId of friendIds) {
        io.to(friendId).emit('friend_status_update', {
          userId,
          status: 'online',
        });
      }
    }

    const queueSize = await matchingQueue.getQueueSize();
    logger.info(`User ${userId} connected. Queue size: ${queueSize}`);

    socket.on('join_queue', async (preferences: MatchPreferences) => {
      try {
        const result = await matchingQueue.addToQueue({
          ...preferences,
          userId,
        });

        socket.emit('queue_joined', {
          position: result.position,
          estimatedWait: result.estimatedWait,
          queueSize: await matchingQueue.getQueueSize(),
        });

        startPositionUpdates(socket, userId);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('leave_queue', async () => {
      await matchingQueue.removeFromQueue(userId);
      stopPositionUpdates(socket);
      socket.emit('queue_left');
    });

    socket.on('session_ready', async ({ sessionId }: { sessionId: string }) => {
      const sessionData = await prisma.videoSession.findUnique({
        where: { id: sessionId },
        select: { user1Id: true, user2Id: true },
      });

      if (!sessionData) return;

      await prisma.videoSession.update({
        where: { id: sessionId },
        data: { status: 'active' },
      });

      const otherUserId = sessionData.user1Id === userId ? sessionData.user2Id : sessionData.user1Id;

      io.to(userId).emit('session_started', {
        sessionId,
        duration: 15,
        matchedWith: otherUserId,
      });

      io.to(otherUserId).emit('session_started', {
        sessionId,
        duration: 15,
        matchedWith: userId,
      });

      adminSocketService.emitSessionStart({
        sessionId,
        user1Id: sessionData.user1Id,
        user2Id: sessionData.user2Id,
      });

      realTimeModeration.startSessionMonitoring(sessionId, sessionData.user1Id, sessionData.user2Id);

      logger.info(`Session ${sessionId} started`);
    });

    socket.on('friend_call_ready', async ({ sessionId }: { sessionId: string }) => {
      const sessionData = await prisma.videoSession.findUnique({
        where: { id: sessionId },
        select: { user1Id: true, user2Id: true },
      });

      if (!sessionData) return;

      await prisma.videoSession.update({
        where: { id: sessionId },
        data: { status: 'active' },
      });

      const otherUserId = sessionData.user1Id === userId ? sessionData.user2Id : sessionData.user1Id;

      io.to(userId).emit('friend_call_started', { sessionId });
      io.to(otherUserId).emit('friend_call_started', { sessionId });

      await prisma.friend.updateMany({
        where: {
          OR: [
            { user1Id: userId, user2Id: otherUserId },
            { user1Id: otherUserId, user2Id: userId },
          ],
        },
        data: {
          lastChatAt: new Date(),
          chatCount: { increment: 1 },
        },
      });

      realTimeModeration.startSessionMonitoring(sessionId, sessionData.user1Id, sessionData.user2Id);

      logger.info(`Friend call ${sessionId} started`);
    });

    socket.on('webrtc_signal', async ({ sessionId, signal, targetUserId }: SignalData) => {
      io.to(targetUserId).emit('webrtc_signal', {
        sessionId,
        signal,
        fromUserId: userId,
      });
    });

    socket.on('request_extend', async ({ sessionId }: { sessionId: string }) => {
      const sessionData = await prisma.videoSession.findUnique({
        where: { id: sessionId },
        select: { user1Id: true, user2Id: true, extended: true },
      });

      if (!sessionData || sessionData.extended) return;

      await prisma.$transaction(async (tx) => {
        if (userId === sessionData.user1Id) {
          await tx.videoSession.update({
            where: { id: sessionId },
            data: { extendedByUser1: true },
          });
        } else {
          await tx.videoSession.update({
            where: { id: sessionId },
            data: { extendedByUser2: true },
          });
        }
      });

      const otherUserId = sessionData.user1Id === userId ? sessionData.user2Id : sessionData.user1Id;

      const bothExtended = await prisma.videoSession.findUnique({
        where: { id: sessionId },
        select: { extendedByUser1: true, extendedByUser2: true },
      });

      if (bothExtended?.extendedByUser1 && bothExtended?.extendedByUser2) {
        await prisma.videoSession.update({
          where: { id: sessionId },
          data: { extended: true, extendCount: { increment: 1 } },
        });

        io.to(sessionData.user1Id).emit('session_extended', { sessionId });
        io.to(sessionData.user2Id).emit('session_extended', { sessionId });

        logger.info(`Session ${sessionId} extended by both users`);
      } else {
        io.to(otherUserId).emit('extend_requested', {
          sessionId,
          requestedBy: userId,
        });
      }
    });

    socket.on('end_session', async ({ sessionId }: { sessionId: string }) => {
      realTimeModeration.stopSessionMonitoring(sessionId);

      const session = await prisma.videoSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) return;

      const startedAt = await prisma.videoSession.findUnique({
        where: { id: sessionId },
        select: { startedAt: true },
      });

      const duration = startedAt
        ? Math.floor((Date.now() - startedAt.startedAt.getTime()) / 1000)
        : session.durationSeconds;

      await prisma.videoSession.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          durationSeconds: duration,
        },
      });

      await prisma.user.updateMany({
        where: { id: { in: [session.user1Id, session.user2Id] } },
        data: { totalSessions: { increment: 1 } },
      });

      io.to(session.user1Id).emit('session_ended', { sessionId, duration });
      io.to(session.user2Id).emit('session_ended', { sessionId, duration });

      adminSocketService.emitSessionEnd({
        sessionId,
        user1Id: session.user1Id,
        user2Id: session.user2Id,
        duration,
      });

      logger.info(`Session ${sessionId} ended, duration: ${duration}s`);
    });

    socket.on('moderation_frame_response', async ({ sessionId, frameData }: { sessionId: string; frameData: string }) => {
      // Frame data is handled by realTimeModeration service
    });

    socket.on('call_friend', async ({ friendId }: { friendId: string }) => {
      const friendship = await prisma.friend.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: friendId },
            { user1Id: friendId, user2Id: userId },
          ],
          status: 'accepted',
        },
      });

      if (!friendship) {
        socket.emit('error', { message: 'Not friends with this user' });
        return;
      }

      const friend = await prisma.user.findUnique({
        where: { id: friendId },
        select: { status: true, displayName: true },
      });

      if (!friend) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const session = await prisma.videoSession.create({
        data: {
          user1Id: userId,
          user2Id: friendId,
          status: 'connecting',
          maxDurationSeconds: 3600,
        },
      });

      await NotificationService.createIncomingCall(friendId, userId, 'User', session.id);

      io.to(friendId).emit('incoming_call', {
        sessionId: session.id,
        from: { id: userId, displayName: 'User' },
        type: 'friend_call',
      });

      socket.emit('call_initiated', { sessionId: session.id, friendStatus: friend.status });
    });

    socket.on('respond_to_call', async ({ sessionId, accept }: { sessionId: string; accept: boolean }) => {
      const session = await prisma.videoSession.findUnique({
        where: { id: sessionId },
        select: { user1Id: true, user2Id: true },
      });

      if (!session) return;

      const callerId = session.user1Id === userId ? session.user2Id : session.user1Id;

      if (accept) {
        await prisma.videoSession.update({
          where: { id: sessionId },
          data: { status: 'active' },
        });

        await prisma.friend.updateMany({
          where: {
            OR: [
              { user1Id: userId, user2Id: callerId },
              { user1Id: callerId, user2Id: userId },
            ],
          },
          data: {
            lastChatAt: new Date(),
            chatCount: { increment: 1 },
          },
        });

        io.to(callerId).emit('call_accepted', { sessionId });
        io.to(userId).emit('call_accepted', { sessionId });
      } else {
        await prisma.videoSession.update({
          where: { id: sessionId },
          data: { status: 'ended', endedAt: new Date() },
        });

        io.to(callerId).emit('call_declined', { sessionId });
      }
    });

    socket.on('end_friend_call', async ({ sessionId }: { sessionId: string }) => {
      realTimeModeration.stopSessionMonitoring(sessionId);

      const session = await prisma.videoSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) return;

      const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

      await prisma.videoSession.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          durationSeconds: duration,
        },
      });

      io.to(session.user1Id).emit('friend_call_ended', { sessionId, duration });
      io.to(session.user2Id).emit('friend_call_ended', { sessionId, duration });

      logger.info(`Friend call ${sessionId} ended, duration: ${duration}s`);
    });

    socket.on('get_queue_stats', async () => {
      const stats = await matchingQueue.getMatchStats();
      socket.emit('queue_stats', stats);
    });

    socket.on('disconnect', async () => {
      realTimeModeration.unregisterSocket(userId);

      await matchingQueue.removeFromQueue(userId);

      await prisma.user.update({
        where: { id: userId },
        data: { status: 'offline' },
      });

      const friends = await prisma.friend.findMany({
        where: {
          OR: [
            { user1Id: userId, status: 'accepted' },
            { user2Id: userId, status: 'accepted' },
          ],
        },
        select: { user1Id: true, user2Id: true },
      });

      const friendIds = friends.map((f) =>
        f.user1Id === userId ? f.user2Id : f.user1Id
      );

      for (const friendId of friendIds) {
        io.to(friendId).emit('friend_status_update', {
          userId,
          status: 'offline',
          lastActiveAt: new Date(),
        });
      }

      stopPositionUpdates(socket);
      logger.info(`User ${userId} disconnected`);
    });
  });

  const positionUpdateIntervals = new Map<string, NodeJS.Timeout>();

  function startPositionUpdates(socket: Socket, userId: string) {
    stopPositionUpdates(socket);

    const interval = setInterval(async () => {
      try {
        const position = await matchingQueue.getQueuePosition(userId);
        if (position > 0) {
          socket.emit('queue_position_update', { position });
        }
      } catch {
      }
    }, 3000);

    positionUpdateIntervals.set(socket.id, interval);
  }

  function stopPositionUpdates(socket: Socket) {
    const interval = positionUpdateIntervals.get(socket.id);
    if (interval) {
      clearInterval(interval);
      positionUpdateIntervals.delete(socket.id);
    }
  }

  process.on('SIGTERM', () => {
    matchingQueue.stopMatchLoop();
  });

  process.on('SIGINT', () => {
    matchingQueue.stopMatchLoop();
  });

  return matchingQueue;
};
