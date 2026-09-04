import { Router } from 'express';
import { prisma } from '@yt/database';
import { authenticate, optionalAuth, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { commentCreateSchema } from '@yt/shared';
import { AppError } from '../middleware/errorHandler';

export const commentRouter = Router();

commentRouter.get('/video/:videoId', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const sort = (req.query.sort as string) || 'top';

    const orderBy = sort === 'newest' ? { createdAt: 'desc' as const } : { likes: 'desc' as const };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { videoId: req.params.videoId, parentId: null },
        orderBy: [{ isPinned: 'desc' }, orderBy],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.comment.count({ where: { videoId: req.params.videoId, parentId: null } }),
    ]);

    res.json({
      success: true,
      data: comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

commentRouter.get('/:id/replies', async (req, res, next) => {
  try {
    const replies = await prisma.comment.findMany({
      where: { parentId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: replies });
  } catch (err) { next(err); }
});

commentRouter.post('/', authenticate, validate(commentCreateSchema), async (req: AuthRequest, res, next) => {
  try {
    const { videoId, content, parentId } = req.body;

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new AppError('Video not found', 404);
    if (!video.allowComments) throw new AppError('Comments are disabled', 403);

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent) throw new AppError('Parent comment not found', 404);
    }

    const comment = await prisma.comment.create({
      data: { videoId, userId: req.user!.id, content, parentId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

commentRouter.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.userId !== req.user!.id) throw new AppError('Unauthorized', 403);

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
});
