'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

interface SystemHealth {
  database: {
    healthy: boolean;
    responseTime: number;
  };
  server: {
    uptime: number;
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    nodeVersion: string;
    platform: string;
  };
  metrics: {
    totalUsers: number;
    activeSessions: number;
    pendingReports: number;
    recentErrors: number;
  };
  timestamp: string;
}

interface PerformanceMetrics {
  activeSessions: number;
  matchesPerHour: number;
  reportsPerHour: number;
  avgSessionDuration: number;
  peakHour: string | null;
  peakHourSessions: number;
  timestamp: string;
}

interface ErrorLog {
  id: string;
  eventType: string;
  eventData: any;
  deviceType: string | null;
  platform: string | null;
  createdAt: string;
}

export default function AdminSystem() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const [healthRes, perfRes, errorsRes] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getPerformanceMetrics(),
        adminApi.getErrorLogs({ hours: 24, limit: 20 }),
      ]);
      setHealth(healthRes.data);
      setPerformance(perfRes.data);
      setErrorLogs(errorsRes.data.errors);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh (30s)</span>
          </label>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Database & Server Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Database</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                health?.database.healthy
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {health?.database.healthy ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Response Time</span>
              <span className="font-semibold text-gray-900">{health?.database.responseTime}ms</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  (health?.database.responseTime || 0) < 100
                    ? 'bg-green-500'
                    : (health?.database.responseTime || 0) < 500
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(((health?.database.responseTime || 0) / 1000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Server</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Uptime</span>
              <span className="font-semibold text-gray-900">{formatUptime(health?.server.uptime || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Memory (RSS)</span>
              <span className="font-semibold text-gray-900">{health?.server.memoryUsage.rss} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Heap Used</span>
              <span className="font-semibold text-gray-900">{health?.server.memoryUsage.heapUsed} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Node Version</span>
              <span className="font-semibold text-gray-900">{health?.server.nodeVersion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Platform</span>
              <span className="font-semibold text-gray-900">{health?.server.platform}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{performance.activeSessions}</p>
              <p className="text-sm text-gray-600 mt-1">Active Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{performance.matchesPerHour}</p>
              <p className="text-sm text-gray-600 mt-1">Matches/Hour</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{performance.reportsPerHour}</p>
              <p className="text-sm text-gray-600 mt-1">Reports/Hour</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(performance.avgSessionDuration / 60)}m
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg Session</p>
            </div>
          </div>
        </div>
      )}

      {/* System Metrics */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{health?.metrics.totalUsers}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Active Sessions</p>
            <p className="text-2xl font-bold text-blue-700">{health?.metrics.activeSessions}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">Pending Reports</p>
            <p className="text-2xl font-bold text-red-700">{health?.metrics.pendingReports}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Errors (24h)</p>
            <p className="text-2xl font-bold text-yellow-700">{health?.metrics.recentErrors}</p>
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Errors (24h)</h2>
        </div>

        {errorLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No errors in the last 24 hours</div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {errorLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{log.eventType}</p>
                    <p className="text-sm text-gray-500">
                      {log.platform} / {log.deviceType || 'Unknown'}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.eventData && (
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.eventData, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
