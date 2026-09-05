import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { connectRedis } from './config/redis';
import prisma from './config/database';
import logger from './config/logger';
import { setupSocketIO } from './services/socketService';
import { momentCleanupService } from './services/momentCleanupService';
import { compressionMiddleware, cacheControlMiddleware, etagMiddleware } from './middleware/compression';
import { metricsMiddleware, metricsEndpoint, healthEndpoint, readinessEndpoint, livenessEndpoint } from './services/metricsService';
import { getPerformanceManager } from './services/performanceManager';
import { getJobQueue, scheduleCleanupJob } from './services/jobQueueService';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import momentRoutes from './routes/moment';
import friendRoutes from './routes/friend';
import reportRoutes from './routes/report';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notification';
import moderationRoutes from './routes/moderation';
import subscriptionRoutes from './routes/subscription';
import subscriptionAdminRoutes from './routes/subscriptionAdmin';
import premiumFeaturesRoutes from './routes/premiumFeatures';
import complianceRoutes from './routes/compliance';
import adminRoutes from './routes/admin';
import { errorHandler, notFound } from './middleware/error';
import { requireAgeVerification, checkParentalRestrictions } from './middleware/compliance';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: { level: 6 },
    zlibInflateOptions: { chunkSize: 10 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
  },
  maxHttpBufferSize: 1e6,
  pingTimeout: 30000,
  pingInterval: 15000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(compressionMiddleware());
app.use(etagMiddleware());
app.use(metricsMiddleware());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
});
app.use('/api/auth/', authLimiter);

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});

app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/upload', cacheControlMiddleware(0, 0), uploadRoutes);
app.use('/api/moments', requireAgeVerification, checkParentalRestrictions, momentRoutes);
app.use('/api/friends', requireAgeVerification, checkParentalRestrictions, friendRoutes);
app.use('/api/reports', requireAgeVerification, reportRoutes);
app.use('/api/users', requireAgeVerification, checkParentalRestrictions, userRoutes);
app.use('/api/notifications', requireAgeVerification, notificationRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/subscription', requireAgeVerification, subscriptionRoutes);
app.use('/api/subscription/admin', subscriptionAdminRoutes);
app.use('/api/premium', requireAgeVerification, premiumFeaturesRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', healthEndpoint);
app.get('/ready', readinessEndpoint);
app.get('/live', livenessEndpoint);
app.get('/metrics', metricsEndpoint);

app.get('/', (req, res) => {
  res.json({
    name: 'Ninor API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    const perfManager = getPerformanceManager();
    await perfManager.initialize();
    logger.info('Performance manager initialized');

    logger.info('Database connected');

    await connectRedis();
    logger.info('Redis connected');

    setupSocketIO(io);
    logger.info('Socket.IO initialized');

    momentCleanupService.start();
    logger.info('Cleanup service started');

    const jobQueue = getJobQueue(4);
    jobQueue.register('send-email', async (data: any) => {
      const { emailService } = await import('./services/emailService');
      await emailService.send({ to: data.to, subject: data.subject, html: data.body });
    });
    jobQueue.register('cleanup-expired', async () => {
      await momentCleanupService.runCleanup();
      await scheduleCleanupJob();
    });
    await scheduleCleanupJob();
    logger.info('Job queue initialized');

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  const perfManager = getPerformanceManager();
  httpServer.close(() => {
    perfManager.shutdown().then(() => process.exit(0));
  });
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason.message || reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message);
  getPerformanceManager().shutdown().then(() => process.exit(1));
});

export { app, io, httpServer };
