'use client';

import { useEffect, useState } from 'react';
import { useModerationStore } from '@/store/moderationStore';

export function MLStatsPanel() {
  const { mlStats, fetchMLStats, updateMLThresholds, loading } = useModerationStore();
  const [thresholds, setThresholds] = useState({
    nudity: 0.85,
    violence: 0.80,
    explicit: 0.90,
    suggestive: 0.75,
    terminateThreshold: 0.95,
    warnThreshold: 0.70,
  });

  useEffect(() => {
    fetchMLStats();
  }, [fetchMLStats]);

  const handleUpdateThresholds = async () => {
    await updateMLThresholds(thresholds);
  };

  return (
    <div className="space-y-6">
      {mlStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Frames Analyzed</p>
            <p className="text-2xl font-bold text-gray-900">{mlStats.mlStats?.analysisCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Violators</p>
            <p className="text-2xl font-bold text-red-600">{mlStats.mlStats?.activeViolators || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Flagged Sessions</p>
            <p className="text-2xl font-bold text-yellow-600">{mlStats.flaggedSessions || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Monitors</p>
            <p className="text-2xl font-bold text-blue-600">{mlStats.mlStats?.activeSessions || 0}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ML Detection Thresholds</h3>
        <p className="text-sm text-gray-500 mb-6">
          Adjust confidence thresholds for content detection. Lower values = more sensitive.
        </p>

        <div className="space-y-4">
          {Object.entries(thresholds).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => setThresholds({ ...thresholds, [key]: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-sm font-mono w-12 text-right">{value.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleUpdateThresholds}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Thresholds'}
          </button>
        </div>
      </div>

      {mlStats?.recentFlags?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Flags (24h)</h3>
          <div className="space-y-3">
            {mlStats.recentFlags.map((flag: any) => (
              <div key={flag.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Session {flag.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(flag.startedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    flag.flaggedContent ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    Score: {flag.moderationScore || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
