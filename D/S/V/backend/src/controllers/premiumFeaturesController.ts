import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import logger from '../config/logger';
import { MatchingQueue } from '../services/matchingQueue';

const matchingQueue = new MatchingQueue();

const rewindSchema = z.object({
  matchId: z.string().uuid(),
});

export const getRecentMatches = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const matches = await matchingQueue.getRecentMatches(req.userId!, Number(limit));
    res.json({ matches });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rewindMatch = async (req: AuthRequest, res: Response) => {
  try {
    const body = rewindSchema.parse(req.body);
    const result = await matchingQueue.rewindMatch(req.userId!, body.matchId);

    if (!result) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      sessionId: result.sessionId,
      partnerId: result.partnerId,
      message: 'Rewind successful',
    });
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

export const getWhoAddedAsFriend = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await matchingQueue.getWhoAddedAsFriend(req.userId!);
    res.json({ requests });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDailyMatchStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayMatches, totalMatches, user] = await Promise.all([
      prisma.matchHistory.count({
        where: { userId: req.userId!, matchedAt: { gte: new Date(today) } },
      }),
      prisma.matchHistory.count({
        where: { userId: req.userId! },
      }),
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: { premiumTier: true, isPremium: true },
      }),
    ]);

    const features = await prisma.subscriptionFeature.findFirst({
      where: { plan: (user?.premiumTier || 'free') as any },
      select: { maxDailyMatches: true },
    });

    res.json({
      todayMatches,
      totalMatches,
      dailyLimit: features?.maxDailyMatches || 10,
      canMatchMore: todayMatches < (features?.maxDailyMatches || 10),
      plan: user?.premiumTier || 'free',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
