import prisma from '../config/database';
import { Server } from 'socket.io';
import logger from '../config/logger';

export interface NotificationData {
  userId: string;
  type: 'friend_request' | 'friend_accepted' | 'incoming_call' | 'message' | 'report_update' | 'subscription' | 'system';
  title: string;
  message?: string;
  targetType?: string;
  targetId?: string;
  deliveredVia?: string[];
  expiresAt?: Date;
}

let ioInstance: Server | null = null;

export function setNotificationIO(io: Server) {
  ioInstance = io;
}

function emitToUser(userId: string, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit(event, data);
  }
}

export class NotificationService {
  static async create(data: NotificationData): Promise<any> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        targetType: data.targetType,
        targetId: data.targetId,
        deliveredVia: data.deliveredVia || ['in_app'],
        expiresAt: data.expiresAt,
      },
    });

    emitToUser(data.userId, 'notification_received', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetType: notification.targetType,
      targetId: notification.targetId,
      createdAt: notification.createdAt,
    });

    logger.info(`Notification created for ${data.userId}: ${data.type}`);

    return notification;
  }

  static async createFriendRequest(toUserId: string, fromUserId: string, fromDisplayName: string, friendId: string): Promise<void> {
    await this.create({
      userId: toUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${fromDisplayName} wants to be your friend`,
      targetType: 'friend',
      targetId: friendId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  static async createFriendAccepted(toUserId: string, acceptedDisplayName: string, friendId: string): Promise<void> {
    await this.create({
      userId: toUserId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      message: `${acceptedDisplayName} accepted your friend request`,
      targetType: 'friend',
      targetId: friendId,
    });
  }

  static async createIncomingCall(toUserId: string, fromUserId: string, fromDisplayName: string, sessionId: string): Promise<void> {
    await this.create({
      userId: toUserId,
      type: 'incoming_call',
      title: 'Incoming Call',
      message: `${fromDisplayName} is calling you`,
      targetType: 'call',
      targetId: sessionId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  }

  static async createMessage(toUserId: string, fromDisplayName: string, sessionId: string): Promise<void> {
    await this.create({
      userId: toUserId,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${fromDisplayName}`,
      targetType: 'message',
      targetId: sessionId,
    });
  }

  static async createReportUpdate(userId: string, reportId: string, action: string): Promise<void> {
    await this.create({
      userId,
      type: 'report_update',
      title: 'Report Update',
      message: `Your report has been ${action}`,
      targetType: 'report',
      targetId: reportId,
    });
  }

  static async cleanupExpired(): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired notifications`);
    }

    return result.count;
  }

  static async cleanupOld(readDays: number = 30, unreadDays: number = 90): Promise<number> {
    const readCutoff = new Date(Date.now() - readDays * 24 * 60 * 60 * 1000);
    const unreadCutoff = new Date(Date.now() - unreadDays * 24 * 60 * 60 * 1000);

    const result = await prisma.notification.deleteMany({
      where: {
        OR: [
          { isRead: true, createdAt: { lt: readCutoff } },
          { isRead: false, createdAt: { lt: unreadCutoff } },
        ],
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old notifications`);
    }

    return result.count;
  }
}
