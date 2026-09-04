import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { videoRouter } from './routes/videos';
import { channelRouter } from './routes/channels';
import { commentRouter } from './routes/comments';
import { playlistRouter } from './routes/playlists';
import { subscriptionRouter } from './routes/subscriptions';
import { searchRouter } from './routes/search';
import { feedRouter } from './routes/feed';
import { notificationRouter } from './routes/notifications';
import { analyticsRouter } from './routes/analytics';
import { shortsRouter } from './routes/shorts';
import { liveRouter } from './routes/live';
import { uploadRouter } from './routes/upload';
import { adminRouter } from './routes/admin';
import { userRouter } from './routes/users';
import { communityRouter } from './routes/community';

export async function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/videos', videoRouter);
  app.use('/api/channels', channelRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/playlists', playlistRouter);
  app.use('/api/subscriptions', subscriptionRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/feed', feedRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/shorts', shortsRouter);
  app.use('/api/live', liveRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/me', userRouter);
  app.use('/api/community', communityRouter);

  app.use(errorHandler);

  return app;
}
