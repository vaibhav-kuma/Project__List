'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

interface Retention {
  day1: number;
  day7: number;
  day30: number;
}

interface GeographicDistribution {
  country: string;
  users: number;
  percentage: number;
}

interface ActivityTimeline {
  date: string;
  activeUsers: number;
  matches: number;
  reports: number;
  newUsers: number;
}

interface PremiumAnalytics {
  freeUsers: number;
  plusUsers: number;
  proUsers: number;
  trialUsers: number;
  conversionRate: number;
  monthlyRevenue: number;
  churnRate: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [geographic, setGeographic] = useState<GeographicDistribution[]>([]);
  const [timeline, setTimeline] = useState<ActivityTimeline[]>([]);
  const [premium, setPremium] = useState<PremiumAnalytics | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await adminApi.getAnalytics();
      setRetention(data.retention);
      setGeographic(data.geographic);
      setTimeline(data.timeline);
      setPremium(data.premium);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const maxUsers = Math.max(...timeline.map((t) => t.activeUsers), 1);
  const maxMatches = Math.max(...timeline.map((t) => t.matches), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Retention */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Retention</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{retention?.day1}%</div>
            <p className="text-gray-600 mt-2">Day 1 Retention</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">{retention?.day7}%</div>
            <p className="text-gray-600 mt-2">Day 7 Retention</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600">{retention?.day30}%</div>
            <p className="text-gray-600 mt-2">Day 30 Retention</p>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">30-Day Activity Timeline</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Active Users</p>
            <div className="flex items-end gap-1 h-32">
              {timeline.map((t, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${(t.activeUsers / maxUsers) * 100}%` }}
                  title={`${t.date}: ${t.activeUsers} users`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Matches</p>
            <div className="flex items-end gap-1 h-24">
              {timeline.map((t, i) => (
                <div
                  key={i}
                  className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                  style={{ height: `${(t.matches / maxMatches) * 100}%` }}
                  title={`${t.date}: ${t.matches} matches`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h2>
          <div className="space-y-3">
            {geographic.slice(0, 10).map((g, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-700">{g.country}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${g.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">
                    {g.users} ({g.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Premium Analytics */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Premium Analytics</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Free Users</p>
                <p className="text-2xl font-bold text-gray-900">{premium?.freeUsers}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-600">Plus Users</p>
                <p className="text-2xl font-bold text-yellow-700">{premium?.plusUsers}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600">Pro Users</p>
                <p className="text-2xl font-bold text-purple-700">{premium?.proUsers}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-blue-700">{premium?.conversionRate}%</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Monthly Revenue</span>
                <span className="text-xl font-bold text-green-600">
                  ${premium?.monthlyRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600">Churn Rate</span>
                <span className="text-xl font-bold text-red-600">{premium?.churnRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
