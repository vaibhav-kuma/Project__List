import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from '../config';

let io: SocketServer | null = null;

export function getSocketIO(server?: HttpServer): SocketServer {
  if (io) return io;

  if (!server) {
    throw new Error('Socket.IO server not initialized. Call initializeSocketIO first.');
  }

  io = new SocketServer(server, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwt.secret);
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`User connected: ${user?.username || 'anonymous'}`);

    // Join user-specific room for notifications
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    // Upload progress tracking
    socket.on('upload:progress', (data: { uploadId: string; progress: number }) => {
      socket.to(`upload:${data.uploadId}`).emit('upload:update', { progress: data.progress });
    });

    // Video processing updates
    socket.on('processing:subscribe', (videoId: string) => {
      socket.join(`processing:${videoId}`);
    });

    socket.on('processing:unsubscribe', (videoId: string) => {
      socket.leave(`processing:${videoId}`);
    });

    // Live streaming chat
    socket.on('live:join', (streamId: string) => {
      socket.join(`live:${streamId}`);
      io?.to(`live:${streamId}`).emit('live:viewerCount', io?.sockets.adapter.rooms.get(`live:${streamId}`)?.size || 1);
    });

    socket.on('live:leave', (streamId: string) => {
      socket.leave(`live:${streamId}`);
    });

    socket.on('live:chat', (data: { streamId: string; message: string }) => {
      io?.to(`live:${data.streamId}`).emit('live:chatMessage', {
        user: { id: user?.id, username: user?.username, avatarUrl: null },
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    });

    // Notification read acknowledgments
    socket.on('notification:read', (notificationId: string) => {
      io?.to(`user:${user?.id}`).emit('notification:readAck', { id: notificationId });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user?.username || 'anonymous'}`);
    });
  });

  return io;
}

export function sendNotification(userId: string, notification: { type: string; title: string; message?: string; thumbnailUrl?: string; actionUrl?: string }) {
  io?.to(`user:${userId}`).emit('notification:new', notification);
}

export function sendProcessingUpdate(videoId: string, data: { status: string; progress: number; qualities?: any }) {
  io?.to(`processing:${videoId}`).emit('processing:update', data);
}
