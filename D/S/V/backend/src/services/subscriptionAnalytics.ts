import prisma from '../config/database';
import logger from '../config/logger';

export interface SubscriptionAnalytics {
  totalSubscribers: number;
  activeSubscribers: number;
  trialConversions: number;
  churnRate: number;
  mrr: number;
  arr: number;
  planDistribution: Record<string, number>;
  intervalDistribution: Record<string, number>;
  recentCancellations: number;
  recentSignups: number;
  avgSubscriptionDuration: number;
}

export class SubscriptionAnalyticsService {
  static async getOverview(): Promise<SubscriptionAnalytics> {
    const [
      totalSubscribers,
      activeSubscribers,
      trialingSubscribers,
      cancelledSubscribers,
      expiredSubscribers,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'trialing' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count({ where: { status: 'expired' } }),
    ]);

    const planDistribution = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
      where: { status: { in: ['active', 'trialing'] } },
    });

    const intervalDistribution = await prisma.subscription.groupBy({
      by: ['interval'],
      _count: true,
      where: { status: { in: ['active', 'trialing'] } },
    });

    const monthlyRevenue = await prisma.subscription.aggregate({
      where: { status: { in: ['active', 'trialing'] } },
      _sum: {
        amount: true,
      },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentSignups, recentCancellations] = await Promise.all([
      prisma.subscription.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ['active', 'trialing'] },
        },
      }),
      prisma.subscription.count({
        where: {
          cancelledAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const trialConversionRate = await this.getTrialConversionRate();

    const totalActive = activeSubscribers + trialingSubscribers;
    const churnRate = totalActive > 0 ? (recentCancellations / totalActive) * 100 : 0;

    const mrr = Number(monthlyRevenue._sum.amount || 0);
    const arr = mrr * 12;

    const plans: Record<string, number> = {};
    planDistribution.forEach((p) => {
      plans[p.plan] = p._count;
    });

    const intervals: Record<string, number> = {};
    intervalDistribution.forEach((i) => {
      intervals[i.interval] = i._count;
    });

    return {
      totalSubscribers,
      activeSubscribers: totalActive,
      trialConversions: Math.round(trialConversionRate * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      mrr,
      arr,
      planDistribution: plans,
      intervalDistribution: intervals,
      recentCancellations,
      recentSignups,
      avgSubscriptionDuration: 0,
    };
  }

  static async getTrialConversionRate(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const trials = await prisma.subscription.count({
      where: {
        trialEndsAt: { not: null, lt: new Date() },
      },
    });

    const converted = await prisma.subscription.count({
      where: {
        trialEndsAt: { not: null, lt: new Date() },
        status: 'active' as any,
      },
    });

    return trials > 0 ? (converted / trials) * 100 : 0;
  }

  static async getRevenueReport(period: 'month' | 'year' = 'month'): Promise<any> {
    const now = new Date();
    const startDate = period === 'year'
      ? new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const payments = await prisma.paymentHistory.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'succeeded',
      },
      select: {
        amount: true,
        currency: true,
        createdAt: true,
        provider: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const revenueByPlan = await prisma.paymentHistory.groupBy({
      by: ['provider'],
      _sum: { amount: true },
      _count: true,
      where: {
        createdAt: { gte: startDate },
        status: 'succeeded',
      },
    });

    return {
      totalRevenue,
      paymentCount: payments.length,
      revenueByPlan,
      period,
      startDate,
      endDate: now,
    };
  }

  static async getUserLifetimeValue(userId: string): Promise<{
    totalSpent: number;
    subscriptionCount: number;
    avgSubscriptionDuration: number;
    lastSubscriptionEnd: Date | null;
  }> {
    const payments = await prisma.paymentHistory.findMany({
      where: { userId, status: 'succeeded' },
      select: { amount: true },
    });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      select: {
        createdAt: true,
        currentPeriodEnd: true,
        cancelledAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    let totalDuration = 0;
    subscriptions.forEach((sub) => {
      const end = sub.cancelledAt || sub.currentPeriodEnd;
      const duration = end.getTime() - sub.createdAt.getTime();
      totalDuration += duration;
    });

    const avgDuration = subscriptions.length > 0 ? totalDuration / subscriptions.length : 0;

    return {
      totalSpent,
      subscriptionCount: subscriptions.length,
      avgSubscriptionDuration: avgDuration / (1000 * 60 * 60 * 24),
      lastSubscriptionEnd: subscriptions[0]?.cancelledAt || subscriptions[0]?.currentPeriodEnd || null,
    };
  }

  static async getChurnPrediction(): Promise<{
    atRiskUsers: number;
    highRiskUsers: number;
    reasons: Record<string, number>;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const atRiskUsers = await prisma.subscription.count({
      where: {
        status: 'active',
        currentPeriodEnd: { lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        cancelAtPeriodEnd: false,
      },
    });

    const highRiskUsers = await prisma.subscription.count({
      where: {
        status: 'past_due',
        failedPaymentCount: { gte: 2 },
      },
    });

    const cancellationReasons = await prisma.subscription.groupBy({
      by: ['cancellationReason'],
      _count: true,
      where: {
        cancellationReason: { not: null },
        cancelledAt: { gte: thirtyDaysAgo },
      },
    });

    const reasons: Record<string, number> = {};
    cancellationReasons.forEach((r) => {
      if (r.cancellationReason) {
        reasons[r.cancellationReason] = r._count;
      }
    });

    return {
      atRiskUsers,
      highRiskUsers,
      reasons,
    };
  }

  static async getDailyActiveSubscribers(days: number = 30): Promise<any[]> {
    const results = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.subscription.count({
        where: {
          status: { in: ['active', 'trialing'] },
          currentPeriodStart: { lte: nextDate },
          currentPeriodEnd: { gte: date },
        },
      });

      results.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return results;
  }
}
