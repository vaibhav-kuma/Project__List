'use client';

import { useEffect } from 'react';
import { useModerationStore } from '@/store/moderationStore';

export function DashboardStats() {
  const { dashboardOverview, fetchDashboard } = useModerationStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!dashboardOverview) return null;

  const { overview, recentActivity, severityDistribution, actionDistribution } = dashboardOverview;

  const statCards = [
    { label: 'Total Reports', value: overview.totalReports, color: 'blue', icon: '📊' },
    { label: 'Pending', value: overview.pendingReports, color: 'yellow', icon: '⏳' },
    { label: 'Resolved', value: overview.resolvedReports, color: 'green', icon: '✅' },
    { label: 'Active Bans', value: overview.activeBans, color: 'red', icon: '🚫' },
    { label: 'Pending Appeals', value: overview.pendingAppeals, color: 'purple', icon: '⚖️' },
    { label: 'ML Frames Analyzed', value: overview.mlStats?.analysisCount || 0, color: 'indigo', icon: '🤖' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border p-4 ${colorClasses[stat.color]}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-75">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity?.slice(0, 10).map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.reportedUser?.displayName}</p>
                  <p className="text-xs text-gray-500 capitalize">{activity.reason}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    activity.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Distribution (7 days)</h3>
          <div className="space-y-3">
            {severityDistribution?.map((dist: any) => (
              <div key={dist.reason} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{dist.reason.replace('_', ' ')}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (dist._count / overview.totalReports) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{dist._count}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-4">Actions Taken (7 days)</h3>
          <div className="space-y-3">
            {actionDistribution?.map((dist: any) => (
              <div key={dist.actionType} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{dist.actionType.replace('_', ' ')}</span>
                <span className="text-sm font-medium text-gray-900">{dist._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
