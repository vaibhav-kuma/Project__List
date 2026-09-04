import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const uploadRouter = Router();

uploadRouter.post('/initiate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { title, description, category, tags, isShort } = req.body;
    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const videoId = uuidv4();
    const video = await prisma.video.create({
      data: {
        id: videoId,
        channelId: channel.id,
        title: title || 'Untitled',
        description: description || '',
        category: category || null,
        tags: tags || [],
        isShort: isShort || false,
        status: 'DRAFT',
      },
    });

    await prisma.videoProcessingJob.create({
      data: { videoId: video.id, status: 'UPLOADING' },
    });

    res.status(201).json({
      success: true,
      data: {
        videoId: video.id,
        presignedUrl: `/api/upload/${video.id}/presigned`,
        // In production, generate actual S3 presigned URL here
      },
    });
  } catch (err) { next(err); }
});

uploadRouter.post('/complete', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { videoId, key } = req.body;
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new AppError('Video not found', 404);

    const channel = await prisma.channel.findUnique({ where: { userId: req.user!.id } });
    if (!channel || video.channelId !== channel.id) throw new AppError('Unauthorized', 403);

    await prisma.video.update({
      where: { id: videoId },
      data: { videoUrl: key, status: 'PROCESSING' },
    });

    await prisma.videoProcessingJob.update({
      where: { videoId },
      data: { status: 'QUEUED' },
    });

    res.json({ success: true, message: 'Upload completed, processing started' });
  } catch (err) { next(err); }
});

uploadRouter.put('/:id/metadata', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const video = await prisma.video.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: video });
  } catch (err) { next(err); }
});

uploadRouter.post('/:id/thumbnail', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { thumbnailUrl } = req.body;
    const video = await prisma.video.update({
      where: { id: req.params.id },
      data: { thumbnailUrl },
    });
    res.json({ success: true, data: video });
  } catch (err) { next(err); }
});

uploadRouter.patch('/:id/visibility', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { visibility, publishAt } = req.body;
    const data: any = { status: visibility };
    if (visibility === 'PUBLIC' && publishAt) {
      data.publishedAt = new Date(publishAt);
    } else if (visibility === 'PUBLIC') {
      data.publishedAt = new Date();
    }
    const video = await prisma.video.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: video });
  } catch (err) { next(err); }
});
