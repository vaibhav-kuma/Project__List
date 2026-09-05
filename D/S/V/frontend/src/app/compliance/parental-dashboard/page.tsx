'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { complianceApi } from '@/lib/complianceApi';

interface ConsentHistory {
  id: string;
  parentEmail: string;
  parentName: string;
  status: 'pending' | 'approved' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  restrictions: {
    timeStart: string;
    timeEnd: string;
    dailyMatchLimit: number;
    allowMessaging: boolean;
    allowVideoChat: boolean;
  };
}

interface Restrictions {
  timeRestriction: {
    allowed: boolean;
    reason: string;
    currentTime: string;
    allowedStart: string;
    allowedEnd: string;
  };
  matchLimit: {
    allowed: boolean;
    remaining: number;
    limit: number;
  };
}

export default function ParentalDashboard() {
  const router = useRouter();
  const [consentHistory, setConsentHistory] = useState<ConsentHistory[]>([]);
  const [restrictions, setRestrictions] = useState<Restrictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    parentEmail: '',
    parentName: '',
    timeStart: '08:00',
    timeEnd: '20:00',
    dailyMatchLimit: 10,
    allowMessaging: true,
    allowVideoChat: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyRes, restrictionsRes] = await Promise.all([
        complianceApi.getConsentHistory(),
        complianceApi.checkParentalRestrictions(),
      ]);
      setConsentHistory(historyRes.data.history || []);
      setRestrictions(restrictionsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await complianceApi.requestParentalConsent({
        userId: 'current-user-id',
        parentEmail: formData.parentEmail,
        parentName: formData.parentName,
        restrictions: {
          timeStart: formData.timeStart,
          timeEnd: formData.timeEnd,
          dailyMatchLimit: formData.dailyMatchLimit,
          allowMessaging: formData.allowMessaging,
          allowVideoChat: formData.allowVideoChat,
        },
      });
      setMessage({ type: 'success', text: 'Consent request sent to parent' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to send request',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (consentId: string) => {
    try {
      await complianceApi.revokeParentalConsent();
      setMessage({ type: 'success', text: 'Consent revoked' });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to revoke consent',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeConsent = consentHistory.find((c) => c.status === 'approved');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parental Controls</h1>
            <p className="text-gray-600 mt-1">Manage consent and restrictions</p>
          </div>
          {!activeConsent && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Request Consent
            </button>
          )}
        </div>

        {message.text && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {activeConsent && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Active Consent</h2>
                <p className="text-sm text-gray-500">Granted by {activeConsent.parentName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Allowed Hours</p>
                <p className="text-lg font-medium text-gray-900">
                  {activeConsent.restrictions.timeStart} - {activeConsent.restrictions.timeEnd}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Daily Match Limit</p>
                <p className="text-lg font-medium text-gray-900">
                  {activeConsent.restrictions.dailyMatchLimit} matches
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Messaging</p>
                <p
                  className={`text-lg font-medium ${
                    activeConsent.restrictions.allowMessaging ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {activeConsent.restrictions.allowMessaging ? 'Allowed' : 'Blocked'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Video Chat</p>
                <p
                  className={`text-lg font-medium ${
                    activeConsent.restrictions.allowVideoChat ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {activeConsent.restrictions.allowVideoChat ? 'Allowed' : 'Blocked'}
                </p>
              </div>
            </div>

            {restrictions && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Current Status</h3>
                <div className="flex items-center gap-4">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      restrictions.timeRestriction.allowed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {restrictions.timeRestriction.allowed ? 'Time OK' : 'Time Restricted'}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      restrictions.matchLimit.allowed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Matches: {restrictions.matchLimit.remaining}/{restrictions.matchLimit.limit}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleRevoke(activeConsent.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm"
              >
                Revoke Consent
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Request Parental Consent</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.timeStart}
                      onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed End Time
                    </label>
                    <input
                      type="time"
                      value={formData.timeEnd}
                      onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Match Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.dailyMatchLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, dailyMatchLimit: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.allowMessaging}
                      onChange={(e) => setFormData({ ...formData, allowMessaging: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Messaging</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.allowVideoChat}
                      onChange={(e) => setFormData({ ...formData, allowVideoChat: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Video Chat</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {submitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {consentHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent History</h2>
            <div className="space-y-3">
              {consentHistory.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{consent.parentName}</p>
                    <p className="text-sm text-gray-500">{consent.parentEmail}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(consent.createdAt).toLocaleDateString()} -{' '}
                      {new Date(consent.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      consent.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : consent.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : consent.status === 'revoked'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {consent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
