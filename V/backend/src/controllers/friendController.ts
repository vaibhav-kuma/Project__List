import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { Server } from 'socket.io';
import logger from '../config/logger';

let ioInstance: Server | null = null;

export function setIOInstance(io: Server) {
  ioInstance = io;
}

function emitToUser(userId: string, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit(event, data);
  }
}

const sendFriendRequestSchema = z.object({
  userId: z.string().uuid(),
  message: z.string().max(200).optional(),
});

export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'accepted' } = req.query;

    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { user1Id: req.userId!, status: status as any },
          { user2Id: req.userId!, status: status as any },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            status: true,
            lastActiveAt: true,
            isPremium: true,
          },
        },
        user2: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            status: true,
            lastActiveAt: true,
            isPremium: true,
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { lastChatAt: 'desc' }],
    });

    const formatted = friends.map((f) => {
      const friend = f.user1Id === req.userId! ? f.user2 : f.user1;
      return {
        friendshipId: f.id,
        id: friend.id,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        isOnline: friend.status === 'online',
        lastActiveAt: friend.lastActiveAt,
        isPremium: friend.isPremium,
        lastChatAt: f.lastChatAt,
        chatCount: f.chatCount,
        isFavorite: f.isFavorite,
        isMuted: f.isMuted,
        notes: f.notes,
      };
    });

    res.json({ friends: formatted });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const body = sendFriendRequestSchema.parse(req.body);

    if (body.userId === req.userId!) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, displayName: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: req.userId!, blockedId: body.userId },
          { blockerId: body.userId, blockedId: req.userId! },
        ],
      },
    });

    if (blocked) {
      return res.status(400).json({ error: 'Cannot send request to blocked user' });
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { user1Id: req.userId!, user2Id: body.userId },
          { user1Id: body.userId, user2Id: req.userId! },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
    }

    const requester = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, displayName: true, avatarUrl: true },
    });

    const friend = await prisma.friend.create({
      data: {
        user1Id: req.userId!,
        user2Id: body.userId,
        status: 'pending',
        requestedBy: req.userId!,
        notes: body.message,
      },
    });

    await prisma.notification.create({
      data: {
        userId: body.userId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${requester?.displayName} wants to be your friend`,
        targetType: 'friend',
        targetId: friend.id,
      },
    });

    emitToUser(body.userId, 'friend_request_received', {
      id: friend.id,
      from: requester,
      message: body.message,
      createdAt: friend.createdAt,
    });

    logger.info(`Friend request sent: ${req.userId!} -> ${body.userId}`);

    res.status(201).json({ friend, message: 'Friend request sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const friend = await prisma.friend.findUnique({
      where: { id: friendId },
      include: {
        user1: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
        user2: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
      },
    });

    if (!friend) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friend.user2Id !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.friend.update({
      where: { id: friendId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId! },
        data: { totalFriends: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: friend.user1Id },
        data: { totalFriends: { increment: 1 } },
      }),
      prisma.notification.updateMany({
        where: {
          userId: friend.user1Id,
          type: 'friend_request',
          targetId: friendId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      }),
    ]);

    emitToUser(friend.user1Id, 'friend_request_accepted', {
      friendId: updated.id,
      acceptedBy: {
        id: req.userId!,
        displayName: friend.user2.displayName,
      },
    });

    emitToUser(friend.user1Id, 'new_friend', {
      id: friend.user2Id,
      displayName: friend.user2.displayName,
      avatarUrl: friend.user2.avatarUrl,
      isOnline: friend.user2.status === 'online',
    });

    emitToUser(req.userId!, 'new_friend', {
      id: friend.user1Id,
      displayName: friend.user1.displayName,
      avatarUrl: friend.user1.avatarUrl,
      isOnline: friend.user1.status === 'online',
    });

    logger.info(`Friend request accepted: ${friend.user1Id} <-> ${req.userId!}`);

    res.json({ friend: updated, message: 'Friend request accepted' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const friend = await prisma.friend.findUnique({
      where: { id: friendId },
      select: { user1Id: true, user2Id: true },
    });

    if (!friend) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friend.user2Id !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.friend.delete({ where: { id: friendId } });

    await prisma.notification.updateMany({
      where: {
        userId: friend.user1Id,
        type: 'friend_request',
        targetId: friendId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    emitToUser(friend.user1Id, 'friend_request_rejected', { friendId });

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const friend = await prisma.friend.findUnique({
      where: { id: friendId },
      select: { user1Id: true, user2Id: true },
    });

    if (!friend) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    if (friend.user1Id !== req.userId! && friend.user2Id !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.friend.delete({ where: { id: friendId } });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId! },
        data: { totalFriends: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: friend.user1Id === req.userId! ? friend.user2Id : friend.user1Id },
        data: { totalFriends: { decrement: 1 } },
      }),
    ]);

    const otherUserId = friend.user1Id === req.userId! ? friend.user2Id : friend.user1Id;
    emitToUser(otherUserId, 'friend_removed', { friendId, removedBy: req.userId! });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const friend = await prisma.friend.findUnique({
      where: { id: friendId },
      select: { isFavorite: true, user1Id: true, user2Id: true },
    });

    if (!friend) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    if (friend.user1Id !== req.userId! && friend.user2Id !== req.userId!) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.friend.update({
      where: { id: friendId },
      data: { isFavorite: !friend.isFavorite },
    });

    res.json({ isFavorite: updated.isFavorite });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateFriendNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;
    const { notes } = req.body;

    if (notes && notes.length > 200) {
      return res.status(400).json({ error: 'Notes must be less than 200 characters' });
    }

    const friend = await prisma.friend.update({
      where: {
        id: friendId,
        OR: [
          { user1Id: req.userId! },
          { user2Id: req.userId! },
        ],
      },
      data: { notes: notes || null },
    });

    res.json({ notes: friend.notes });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (userId === req.userId!) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.blockedUser.create({
        data: {
          blockerId: req.userId!,
          blockedId: userId,
        },
      });

      await tx.friend.deleteMany({
        where: {
          OR: [
            { user1Id: req.userId!, user2Id: userId },
            { user1Id: userId, user2Id: req.userId! },
          ],
        },
      });
    });

    emitToUser(userId, 'blocked', { blockedBy: req.userId! });

    res.json({ message: 'User blocked' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    await prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId: req.userId!,
          blockedId: userId,
        },
      },
    });

    res.json({ message: 'User unblocked' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const received = await prisma.friend.findMany({
      where: {
        user2Id: req.userId!,
        status: 'pending',
      },
      include: {
        user1: {
          select: { id: true, displayName: true, avatarUrl: true, age: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sent = await prisma.friend.findMany({
      where: {
        user1Id: req.userId!,
        status: 'pending',
      },
      include: {
        user2: {
          select: { id: true, displayName: true, avatarUrl: true, age: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      received: received.map((r) => ({
        id: r.id,
        user: r.user1,
        message: r.notes,
        createdAt: r.createdAt,
      })),
      sent: sent.map((s) => ({
        id: s.id,
        user: s.user2,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCallHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const calls = await prisma.videoSession.findMany({
      where: {
        OR: [
          { user1Id: req.userId!, user2Id: friendId },
          { user1Id: friendId, user2Id: req.userId! },
        ],
        status: { in: ['ended', 'extended'] },
      },
      orderBy: { startedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const formatted = calls.map((c) => ({
      id: c.id,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      duration: c.durationSeconds,
      extended: c.extended,
      type: c.extended ? 'extended' : 'random',
    }));

    res.json({ calls: formatted });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const startFriendCall = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { user1Id: req.userId!, user2Id: friendId },
          { user1Id: friendId, user2Id: req.userId! },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      return res.status(400).json({ error: 'Not friends with this user' });
    }

    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: { status: true, displayName: true },
    });

    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await prisma.videoSession.create({
      data: {
        user1Id: req.userId!,
        user2Id: friendId,
        status: 'connecting',
        maxDurationSeconds: 3600,
      },
    });

    emitToUser(friendId, 'incoming_call', {
      sessionId: session.id,
      from: {
        id: req.userId!,
        displayName: (req as any).user?.displayName || 'User',
      },
      type: 'friend_call',
    });

    res.status(201).json({
      session,
      message: friend.status === 'online' ? 'Calling...' : 'User is offline, notification sent',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
