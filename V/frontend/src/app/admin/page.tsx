'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';

interface DashboardStats {
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isConnected, metrics, events, alerts, clearAlerts } = useAdminSocket();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await adminApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayStats = {
    totalUsers: metrics.totalUsers ?? stats?.totalUsers ?? 0,
    activeUsers: metrics.activeUsers ?? stats?.activeUsers ?? 0,
    dailyActiveUsers: metrics.dailyActiveUsers ?? stats?.dailyActiveUsers ?? 0,
    weeklyActiveUsers: metrics.weeklyActiveUsers ?? stats?.weeklyActiveUsers ?? 0,
    monthlyActiveUsers: metrics.monthlyActiveUsers ?? stats?.monthlyActiveUsers ?? 0,
    totalMatches: metrics.totalMatches ?? stats?.totalMatches ?? 0,
    todayMatches: metrics.todayMatches ?? stats?.todayMatches ?? 0,
    totalSessions: metrics.totalSessions ?? stats?.totalSessions ?? 0,
    todaySessions: metrics.todaySessions ?? stats?.todaySessions ?? 0,
    avgChatDuration: stats?.avgChatDuration ?? 0,
    totalReports: metrics.totalReports ?? stats?.totalReports ?? 0,
    pendingReports: metrics.pendingReports ?? stats?.pendingReports ?? 0,
    resolvedReports: metrics.resolvedReports ?? stats?.resolvedReports ?? 0,
    totalPremiumUsers: metrics.totalPremiumUsers ?? stats?.totalPremiumUsers ?? 0,
    premiumConversionRate: stats?.premiumConversionRate ?? 0,
    newUsersToday: metrics.newUsersToday ?? stats?.newUsersToday ?? 0,
    newUsersThisWeek: stats?.newUsersThisWeek ?? 0,
    bannedUsers: metrics.bannedUsers ?? stats?.bannedUsers ?? 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: displayStats.totalUsers, icon: '👥', color: 'bg-blue-500' },
    { label: 'Active Today', value: displayStats.dailyActiveUsers, icon: '🟢', color: 'bg-green-500' },
    { label: 'Active This Week', value: displayStats.weeklyActiveUsers, icon: '📅', color: 'bg-emerald-500' },
    { label: 'New Users Today', value: displayStats.newUsersToday, icon: '🆕', color: 'bg-purple-500' },
    { label: 'Total Matches', value: displayStats.totalMatches, icon: '🤝', color: 'bg-indigo-500' },
    { label: 'Matches Today', value: displayStats.todayMatches, icon: '📊', color: 'bg-cyan-500' },
    { label: 'Avg Chat Duration', value: `${Math.round(displayStats.avgChatDuration / 60)}m`, icon: '⏱️', color: 'bg-orange-500' },
    { label: 'Premium Users', value: displayStats.totalPremiumUsers, icon: '⭐', color: 'bg-yellow-500' },
    { label: 'Conversion Rate', value: `${displayStats.premiumConversionRate}%`, icon: '📈', color: 'bg-pink-500' },
    { label: 'Pending Reports', value: displayStats.pendingReports, icon: '⚠️', color: 'bg-red-500' },
    { label: 'Resolved Reports', value: displayStats.resolvedReports, icon: '✅', color: 'bg-green-600' },
    { label: 'Banned Users', value: displayStats.bannedUsers, icon: '🚫', color: 'bg-gray-700' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            <span className="text-sm text-gray-500">Real-time updates enabled</span>
          </div>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
            <button
              onClick={clearAlerts}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.level === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.level === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value ?? '-'}</p>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/admin/users"
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors"
            >
              <span className="text-2xl">👥</span>
              <p className="font-medium text-gray-900 mt-2">Manage Users</p>
            </a>
            <a
              href="/admin/moderation"
              className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition-colors"
            >
              <span className="text-2xl">🛡️</span>
              <p className="font-medium text-gray-900 mt-2">Moderation Queue</p>
              {displayStats.pendingReports ? (
                <span className="inline-block mt-1 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                  {displayStats.pendingReports} pending
                </span>
              ) : null}
            </a>
            <a
              href="/admin/analytics"
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors"
            >
              <span className="text-2xl">📈</span>
              <p className="font-medium text-gray-900 mt-2">Analytics</p>
            </a>
            <a
              href="/admin/system"
              className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
            >
              <span className="text-2xl">⚙️</span>
              <p className="font-medium text-gray-900 mt-2">System Health</p>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Activity Feed</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Waiting for events...</p>
            ) : (
              events.slice(0, 10).map((event, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <span className="text-lg">
                    {event.type === 'new_user' && '🆕'}
                    {event.type === 'new_report' && '⚠️'}
                    {event.type === 'report_resolved' && '✅'}
                    {event.type === 'session_start' && '🟢'}
                    {event.type === 'session_end' && '🔴'}
                    {event.type === 'match_created' && '🤝'}
                    {event.type === 'user_banned' && '🚫'}
                    {event.type === 'system_error' && '❌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Activity Summary</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Daily Active Users</span>
            <span className="font-semibold text-gray-900">{displayStats.dailyActiveUsers}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
                width: `${displayStats.totalUsers ? (displayStats.dailyActiveUsers / displayStats.totalUsers) * 100 : 0}%`,
              }}
            ></div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Weekly Active Users</span>
            <span className="font-semibold text-gray-900">{displayStats.weeklyActiveUsers}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{
                width: `${displayStats.totalUsers ? (displayStats.weeklyActiveUsers / displayStats.totalUsers) * 100 : 0}%`,
              }}
            ></div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Monthly Active Users</span>
            <span className="font-semibold text-gray-900">{displayStats.monthlyActiveUsers}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{
                width: `${displayStats.totalUsers ? (displayStats.monthlyActiveUsers / displayStats.totalUsers) * 100 : 0}%`,
              }}
            ></div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-gray-600">Premium Conversion</span>
            <span className="font-semibold text-green-600">{displayStats.premiumConversionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
