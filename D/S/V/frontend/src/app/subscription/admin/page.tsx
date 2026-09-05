'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AnalyticsOverview {
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
}

interface ChurnPrediction {
  atRiskUsers: number;
  highRiskUsers: number;
  reasons: Record<string, number>;
}

export default function SubscriptionAnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [churn, setChurn] = useState<ChurnPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, churnRes] = await Promise.all([
        axios.get(`${API_URL}/subscription/admin/analytics`, { headers }),
        axios.get(`${API_URL}/subscription/admin/analytics/churn`, { headers }),
      ]);

      setOverview(overviewRes.data.overview);
      setChurn(churnRes.data.prediction);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Subscription Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor subscription performance and revenue</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Subscribers" value={overview.activeSubscribers} icon="👥" />
          <StatCard label="Monthly Revenue" value={`$${overview.mrr.toFixed(2)}`} icon="💰" />
          <StatCard label="Annual Revenue" value={`$${overview.arr.toFixed(2)}`} icon="📈" />
          <StatCard label="Trial Conversion" value={`${overview.trialConversions}%`} icon="🎯" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
            <div className="space-y-3">
              {Object.entries(overview.planDistribution).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{plan}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / overview.activeSubscribers) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Churn Risk</h3>
            {churn && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-yellow-700">At Risk (expiring soon)</span>
                  <span className="text-lg font-bold text-yellow-700">{churn.atRiskUsers}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-red-700">High Risk (payment failures)</span>
                  <span className="text-lg font-bold text-red-700">{churn.highRiskUsers}</span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Cancellation Reasons</h4>
                  {Object.entries(churn.reasons).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 capitalize">{reason.replace('_', ' ')}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Churn Rate" value={`${overview.churnRate}%`} trend={overview.churnRate < 5 ? 'good' : 'bad'} />
            <MetricCard label="New Signups (30d)" value={overview.recentSignups} trend="neutral" />
            <MetricCard label="Cancellations (30d)" value={overview.recentCancellations} trend={overview.recentCancellations > 10 ? 'bad' : 'good'} />
            <MetricCard label="Total Subscribers" value={overview.totalSubscribers} trend="neutral" />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: string | number; trend: 'good' | 'bad' | 'neutral' }) {
  const trendColors = {
    good: 'text-green-600',
    bad: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${trendColors[trend]}`}>{value}</p>
    </div>
  );
}
