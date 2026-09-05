'use client';

import { useEffect, useState } from 'react';
import { useModerationStore } from '@/store/moderationStore';

export function BannedUsersList() {
  const { bannedUsers, fetchBannedUsers, banUser, warnUser, clearUser, loading } = useModerationStore();
  const [filter, setFilter] = useState('all');
  const [actionModal, setActionModal] = useState<{ type: 'ban' | 'warn' | 'clear'; userId?: string } | null>(null);
  const [actionForm, setActionForm] = useState({
    reason: '',
    duration: 'temporary' as 'temporary' | 'permanent' | 'shadow',
    durationHours: 24,
  });

  useEffect(() => {
    fetchBannedUsers({ type: filter });
  }, [filter, fetchBannedUsers]);

  const handleAction = async () => {
    if (!actionModal?.userId && actionModal?.type !== 'ban') return;

    if (actionModal.type === 'ban' && actionModal.userId) {
      await banUser({
        userId: actionModal.userId,
        reason: actionForm.reason,
        duration: actionForm.duration,
        durationHours: actionForm.duration === 'temporary' ? actionForm.durationHours : undefined,
      });
    } else if (actionModal.type === 'warn' && actionModal.userId) {
      await warnUser({ userId: actionModal.userId, reason: actionForm.reason });
    } else if (actionModal.type === 'clear' && actionModal.userId) {
      await clearUser({ userId: actionModal.userId, reason: actionForm.reason });
    }

    setActionModal(null);
    setActionForm({ reason: '', duration: 'temporary', durationHours: 24 });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'permanent', 'temporary'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ban Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bannedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-500">Score: {user.severityScore}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600 truncate max-w-xs">{user.banReason}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.banExpiresAt ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.banExpiresAt ? 'Temporary' : 'Permanent'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {user.banExpiresAt ? new Date(user.banExpiresAt).toLocaleDateString() : 'Never'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActionModal({ type: 'warn', userId: user.id })}
                      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    >
                      Warn
                    </button>
                    <button
                      onClick={() => setActionModal({ type: 'clear', userId: user.id })}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {actionModal.type} User
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={actionForm.reason}
                  onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter reason..."
                />
              </div>

              {actionModal.type === 'ban' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ban Type</label>
                    <select
                      value={actionForm.duration}
                      onChange={(e) => setActionForm({ ...actionForm, duration: e.target.value as any })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="temporary">Temporary</option>
                      <option value="permanent">Permanent</option>
                      <option value="shadow">Shadow Ban</option>
                    </select>
                  </div>

                  {actionForm.duration === 'temporary' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                      <input
                        type="number"
                        value={actionForm.durationHours}
                        onChange={(e) => setActionForm({ ...actionForm, durationHours: parseInt(e.target.value) })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={loading || !actionForm.reason}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                  actionModal.type === 'warn' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  actionModal.type === 'clear' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
