import { Request, Response } from 'express';
import { UploadService } from '../services/uploadService';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const uploadService = new UploadService();

export const getMomentUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, contentType, isVideo } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const result = await uploadService.getPresignedUrl({
      userId: req.userId!,
      fileName,
      contentType,
      isVideo: isVideo || false,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { key, publicUrl } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const avatarUrl = publicUrl || uploadService.getPublicUrl(key);

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { avatarUrl, avatarPublicId: key },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        avatarPublicId: true,
      },
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCleanupStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await uploadService.cleanupExpiredFiles([]);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
