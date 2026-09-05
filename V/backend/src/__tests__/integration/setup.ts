import { PrismaClient } from '@prisma/client';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

let app: express.Express;
let httpServer: ReturnType<typeof createServer>;
let io: Server;
let prisma: PrismaClient;

beforeAll(async () => {
  const { default: prismaClient } = await import('../../config/database');
  prisma = prismaClient;

  app = express();
  httpServer = createServer(app);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: 'http://localhost:3000' }));
  app.use(express.json());

  io = new Server(httpServer, {
    cors: { origin: 'http://localhost:3000', credentials: true },
  });

  const { default: authRoutes } = await import('../../routes/auth');
  const { default: userRoutes } = await import('../../routes/users');
  const { default: momentRoutes } = await import('../../routes/moment');
  const { default: friendRoutes } = await import('../../routes/friend');
  const { default: reportRoutes } = await import('../../routes/report');
  const { default: moderationRoutes } = await import('../../routes/moderation');
  const { default: subscriptionRoutes } = await import('../../routes/subscription');
  const { default: adminRoutes } = await import('../../routes/admin');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/moments', momentRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
});

afterAll(async () => {
  io.close();
  httpServer.close();
  await prisma.$disconnect();
});

const getBaseUrl = () => `http://localhost:${(httpServer.address() as any).port}`;

export { app, httpServer, io, prisma, getBaseUrl };
