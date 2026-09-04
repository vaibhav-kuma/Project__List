'use client';

import { useEffect, useState } from 'react';
import { moderationApi } from '@/lib/moderationApi';

interface Appeal {
  id: string;
  actionType: string;
  reason: string;
  appealStatus: string;
  appealNotes?: string;
  createdAt: string;
  expiresAt?: string;
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      const data = await moderationApi.getMyAppeals();
      setAppeals(data.appeals);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch appeals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!selectedActionId || !appealReason) return;

    setSubmitting(true);
    try {
      await moderationApi.submitAppeal({
        moderationActionId: selectedActionId,
        reason: appealReason,
      });
      setShowForm(false);
      setAppealReason('');
      setSelectedActionId('');
      await fetchAppeals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">My Appeals</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your moderation appeals</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Appeal History</h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            New Appeal
          </button>
        </div>

        {appeals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No appeals found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appeals.map((appeal) => (
              <div key={appeal.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 capitalize">
                      {appeal.actionType.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{appeal.reason}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appeal.appealStatus)}`}>
                    {appeal.appealStatus}
                  </span>
                </div>

                {appeal.appealNotes && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{appeal.appealNotes}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  Submitted: {new Date(appeal.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit New Appeal</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moderation Action ID
                  </label>
                  <input
                    type="text"
                    value={selectedActionId}
                    onChange={(e) => setSelectedActionId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the action ID from your notification"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Appeal Reason
                  </label>
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    maxLength={2000}
                    placeholder="Explain why you believe this action should be reviewed..."
                  />
                  <p className="text-xs text-gray-500 mt-1">{appealReason.length}/2000</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAppeal}
                  disabled={submitting || !selectedActionId || !appealReason}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Appeal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
