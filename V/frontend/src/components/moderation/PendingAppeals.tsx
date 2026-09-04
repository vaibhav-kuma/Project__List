'use client';

import { useEffect, useState } from 'react';
import { useModerationStore } from '@/store/moderationStore';

export function PendingAppeals() {
  const { pendingAppeals, fetchPendingAppeals, reviewAppeal, loading } = useModerationStore();
  const [selectedAppeal, setSelectedAppeal] = useState<any>(null);
  const [decision, setDecision] = useState<'approved' | 'denied'>('approved');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPendingAppeals();
  }, [fetchPendingAppeals]);

  const handleReview = async () => {
    if (!selectedAppeal) return;
    await reviewAppeal(selectedAppeal.id, { decision, notes });
    setSelectedAppeal(null);
    setNotes('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingAppeals.map((appeal) => (
              <tr key={appeal.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{appeal.user?.displayName}</p>
                  <p className="text-xs text-gray-500">{appeal.user?.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 capitalize">{appeal.actionType.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600 truncate max-w-xs">{appeal.reason}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {new Date(appeal.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedAppeal(appeal)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedAppeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Appeal</h3>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <p className="text-sm text-gray-900">{selectedAppeal.user?.displayName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Original Action</label>
                <p className="text-sm text-gray-900 capitalize">{selectedAppeal.actionType.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Appeal Reason</label>
                <p className="text-sm text-gray-900">{selectedAppeal.appealNotes || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity Score</label>
                <p className="text-sm text-gray-900">{selectedAppeal.user?.severityScore || 0}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDecision('approved')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      decision === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Approve Appeal
                  </button>
                  <button
                    onClick={() => setDecision('denied')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      decision === 'denied'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Deny Appeal
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Add notes about this decision..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedAppeal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                  decision === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Processing...' : `Submit ${decision === 'approved' ? 'Approval' : 'Denial'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
