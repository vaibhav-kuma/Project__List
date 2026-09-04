import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { playlistCreateSchema, playlistUpdateSchema } from '@yt/shared';
import { AppError } from '../middleware/errorHandler';

export const playlistRouter = Router();

playlistRouter.post('/', authenticate, validate(playlistCreateSchema), async (req: AuthRequest, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const playlist = await prisma.playlist.create({
      data: { channelId: channel.id, ...req.body },
    });
    res.status(201).json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

playlistRouter.get('/:id', async (req, res, next) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
      include: {
        channel: { select: { id: true, name: true, handle: true, avatarUrl: true, isVerified: true } },
        videos: {
          orderBy: { position: 'asc' },
          include: {
            video: {
              include: {
                channel: { select: { id: true, name: true, handle: true, avatarUrl: true, isVerified: true } },
              },
            },
          },
        },
      },
    });
    if (!playlist) throw new AppError('Playlist not found', 404);
    res.json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

playlistRouter.put('/:id', authenticate, validate(playlistUpdateSchema), async (req: AuthRequest, res, next) => {
  try {
    const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id } });
    if (!playlist) throw new AppError('Playlist not found', 404);

    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel || playlist.channelId !== channel.id) throw new AppError('Unauthorized', 403);

    const updated = await prisma.playlist.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

playlistRouter.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id } });
    if (!playlist) throw new AppError('Playlist not found', 404);

    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel || playlist.channelId !== channel.id) throw new AppError('Unauthorized', 403);

    await prisma.playlist.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) { next(err); }
});

playlistRouter.post('/:id/videos', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { videoId } = req.body;
    const playlist = await prisma.playlist.findUnique({ where: { id: req.params.id }, include: { videos: { orderBy: { position: 'desc' }, take: 1 } } });
    if (!playlist) throw new AppError('Playlist not found', 404);

    const existing = await prisma.playlistVideo.findUnique({ where: { playlistId_videoId: { playlistId: req.params.id, videoId } } });
    if (existing) throw new AppError('Video already in playlist', 409);

    const maxPosition = playlist.videos[0]?.position || 0;
    const pv = await prisma.playlistVideo.create({
      data: { playlistId: req.params.id, videoId, position: maxPosition + 1 },
    });
    await prisma.playlist.update({ where: { id: req.params.id }, data: { videoCount: { increment: 1 } } });
    res.status(201).json({ success: true, data: pv });
  } catch (err) { next(err); }
});

playlistRouter.delete('/:id/videos/:videoId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.playlistVideo.deleteMany({ where: { playlistId: req.params.id, videoId: req.params.videoId } });
    await prisma.playlist.update({ where: { id: req.params.id }, data: { videoCount: { decrement: 1 } } });
    res.json({ success: true, message: 'Video removed from playlist' });
  } catch (err) { next(err); }
});

playlistRouter.patch('/:id/videos/reorder', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { videoIds } = req.body;
    if (!Array.isArray(videoIds)) throw new AppError('videoIds array required', 400);

    await prisma.$transaction(
      videoIds.map((videoId: string, index: number) =>
        prisma.playlistVideo.updateMany({
          where: { playlistId: req.params.id, videoId },
          data: { position: index },
        }),
      ),
    );
    res.json({ success: true, message: 'Playlist reordered' });
  } catch (err) { next(err); }
});
