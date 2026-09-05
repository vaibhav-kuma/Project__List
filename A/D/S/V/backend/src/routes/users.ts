import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

router.get('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        displayName: true,
        age: true,
        gender: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        premiumTier: true,
        status: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isOwnProfile = req.userId === req.params.userId;

    if (isOwnProfile) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: req.userId!,
          status: { in: ['active', 'trialing', 'past_due'] },
        },
        select: {
          id: true,
          plan: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          trialEndsAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        user,
        subscription: subscription
          ? {
              ...subscription,
              trial: subscription.trialEndsAt
                ? {
                    isTrial: true,
                    endsAt: subscription.trialEndsAt,
                    daysRemaining: Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
                  }
                : { isTrial: false },
            }
          : null,
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    if (q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const blockedRows = await prisma.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: req.userId! },
          { blockedId: req.userId! },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });

    const excludeIds = new Set([
      req.userId!,
      ...blockedRows.map((b) => (b.blockerId === req.userId! ? b.blockedId : b.blockerId)),
    ]);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          AND: [
            { id: { notIn: [...excludeIds] } },
            {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          age: true,
          gender: true,
          isVerified: true,
          status: true,
          lastActiveAt: true,
        },
        skip,
        take: limit,
        orderBy: { displayName: 'asc' },
      }),
      prisma.user.count({
        where: {
          AND: [
            { id: { notIn: [...excludeIds] } },
            {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    ]);

    res.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/online-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.user.count({
      where: { status: 'online' },
    });

    res.json({ onlineCount: count });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me/subscription', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        isPremium: true,
        premiumTier: true,
        premiumExpiresAt: true,
      },
    });

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId!,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const features = await prisma.subscriptionFeature.findFirst({
      where: { plan: (user?.premiumTier || 'free') as any },
    });

    res.json({
      user,
      subscription,
      features,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
