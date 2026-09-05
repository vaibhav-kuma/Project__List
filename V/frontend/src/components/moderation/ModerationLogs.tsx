'use client';

import { useEffect, useState } from 'react';
import { useModerationStore } from '@/store/moderationStore';

export function ModerationLogs() {
  const { moderationLogs, fetchModerationLogs, loading } = useModerationStore();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchModerationLogs({ actionType: filter || undefined });
  }, [filter, fetchModerationLogs]);

  const actionColors: Record<string, string> = {
    warning: 'bg-yellow-100 text-yellow-800',
    temporary_ban: 'bg-orange-100 text-orange-800',
    permanent_ban: 'bg-red-100 text-red-800',
    shadow_ban: 'bg-purple-100 text-purple-800',
    feature_restriction: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            !filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {['warning', 'temporary_ban', 'permanent_ban', 'shadow_ban'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appeal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {moderationLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{log.user?.displayName}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    actionColors[log.actionType] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {log.actionType.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600 truncate max-w-xs">{log.reason}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${log.isAuto ? 'text-blue-600' : 'text-gray-500'}`}>
                    {log.isAuto ? 'Auto' : 'Manual'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${
                    log.appealStatus === 'pending' ? 'text-yellow-600' :
                    log.appealStatus === 'approved' ? 'text-green-600' :
                    log.appealStatus === 'denied' ? 'text-red-600' :
                    'text-gray-400'
                  }`}>
                    {log.appealStatus || 'none'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
