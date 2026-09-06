import prisma from '../config/database';
import logger from '../config/logger';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  totalMatches: number;
  todayMatches: number;
  totalSessions: number;
  todaySessions: number;
  avgChatDuration: number;
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  totalPremiumUsers: number;
  premiumConversionRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  bannedUsers: number;
}

export interface UserRetention {
  day1: number;
  day7: number;
  day30: number;
}

export interface GeographicDistribution {
  country: string;
  users: number;
  percentage: number;
}

export interface ActivityTimeline {
  date: string;
  activeUsers: number;
  matches: number;
  reports: number;
  newUsers: number;
}

export interface PremiumAnalytics {
  freeUsers: number;
  plusUsers: number;
  proUsers: number;
  trialUsers: number;
  conversionRate: number;
  monthlyRevenue: number;
  churnRate: number;
}

class AdminAnalyticsService {
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      totalMatches,
      todayMatches,
      totalSessions,
      todaySessions,
      totalReports,
      pendingReports,
      resolvedReports,
      totalPremiumUsers,
      newUsersToday,
      newUsersThisWeek,
      bannedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: todayStart } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: weekStart } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: monthStart } } }),
      prisma.matchHistory.count(),
      prisma.matchHistory.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.videoSession.count(),
      prisma.videoSession.count({ where: { startedAt: { gte: todayStart } } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    const avgChatDurationResult = await prisma.videoSession.aggregate({
      _avg: { durationSeconds: true },
      where: { durationSeconds: { gt: 0 } },
    });

    const premiumConversionRate = totalUsers > 0 ? (totalPremiumUsers / totalUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      totalMatches,
      todayMatches,
      totalSessions,
      todaySessions,
      avgChatDuration: Math.round(avgChatDurationResult._avg.durationSeconds || 0),
      totalReports,
      pendingReports,
      resolvedReports,
      totalPremiumUsers,
      premiumConversionRate: Math.round(premiumConversionRate * 100) / 100,
      newUsersToday,
      newUsersThisWeek,
      bannedUsers,
    };
  }

  async getUserRetention(): Promise<UserRetention> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    if (newUsers === 0) {
      return { day1: 0, day7: 0, day30: 100 };
    }

    const day1Active = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo, lt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) },
        lastActiveAt: { gte: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) },
      },
    });

    const day7Active = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo, lt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000) },
        lastActiveAt: { gte: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000) },
      },
    });

    const day30Active = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return {
      day1: Math.round((day1Active / newUsers) * 100),
      day7: Math.round((day7Active / newUsers) * 100),
      day30: Math.round((day30Active / newUsers) * 100),
    };
  }

  async getGeographicDistribution(): Promise<GeographicDistribution[]> {
    const profiles = await prisma.userProfile.groupBy({
      by: ['country'],
      _count: { country: true },
      where: { country: { not: null } },
      orderBy: { _count: { country: 'desc' } },
      take: 20,
    });

    const totalUsers = profiles.reduce((sum, p) => sum + p._count.country, 0);

    return profiles.map((p) => ({
      country: p.country || 'Unknown',
      users: p._count.country,
      percentage: totalUsers > 0 ? Math.round((p._count.country / totalUsers) * 100) : 0,
    }));
  }

  async getActivityTimeline(days: number = 30): Promise<ActivityTimeline[]> {
    const timeline: ActivityTimeline[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const [activeUsers, matches, reports, newUsers] = await Promise.all([
        prisma.user.count({
          where: { lastActiveAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.matchHistory.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.report.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
        }),
      ]);

      timeline.push({
        date: dayStart.toISOString().split('T')[0],
        activeUsers,
        matches,
        reports,
        newUsers,
      });
    }

    return timeline;
  }

  async getPremiumAnalytics(): Promise<PremiumAnalytics> {
    const [freeUsers, plusUsers, proUsers, trialUsers] = await Promise.all([
      prisma.user.count({ where: { isPremium: false } }),
      prisma.user.count({ where: { isPremium: true, premiumTier: 'plus' } }),
      prisma.user.count({ where: { isPremium: true, premiumTier: 'pro' } }),
      prisma.user.count({ where: { isPremium: true, premiumTier: 'premium' } }),
    ]);

    const totalUsers = freeUsers + plusUsers + proUsers;
    const conversionRate = totalUsers > 0 ? ((plusUsers + proUsers) / totalUsers) * 100 : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredSubscriptions = await prisma.subscription.count({
      where: {
        status: 'cancelled',
        cancelledAt: { gte: thirtyDaysAgo },
      },
    });

    const activeSubscriptions = plusUsers + proUsers;
    const churnRate = activeSubscriptions > 0 ? (expiredSubscriptions / (activeSubscriptions + expiredSubscriptions)) * 100 : 0;

    const payments = await prisma.paymentHistory.aggregate({
      _sum: { amount: true },
      where: {
        status: 'succeeded',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      freeUsers,
      plusUsers,
      proUsers,
      trialUsers,
      conversionRate: Math.round(conversionRate * 100) / 100,
      monthlyRevenue: Number(payments._sum.amount || 0),
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }

  async getSystemHealth(): Promise<any> {
    const startTime = Date.now();

    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch {
      dbHealthy = false;
    }

    const dbResponseTime = Date.now() - startTime;

    const [
      totalUsers,
      activeSessions,
      pendingReports,
      recentErrors,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.videoSession.count({ where: { endedAt: null } }),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.analyticsEvent.count({
        where: {
          eventType: 'error',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      database: {
        healthy: dbHealthy,
        responseTime: dbResponseTime,
      },
      server: {
        uptime: Math.round(uptime),
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
      metrics: {
        totalUsers,
        activeSessions,
        pendingReports,
        recentErrors,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
