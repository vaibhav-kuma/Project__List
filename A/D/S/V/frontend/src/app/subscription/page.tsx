'use client';

import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export default function SubscriptionPage() {
  const {
    currentSubscription,
    userStatus,
    features,
    trial,
    fetchCurrentSubscription,
    cancelSubscription,
    reactivateSubscription,
    loading,
    error,
  } = useSubscriptionStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchCurrentSubscription();
  }, [fetchCurrentSubscription]);

  const handleCancel = async () => {
    setCancelling(true);
    await cancelSubscription(cancelReason || undefined);
    setCancelling(false);
    setShowCancelModal(false);
  };

  const handleReactivate = async () => {
    await reactivateSubscription();
  };

  const handleManageBilling = async () => {
    const { createBillingPortalSession } = useSubscriptionStore.getState();
    try {
      const { url } = await createBillingPortalSession(window.location.href);
      window.location.href = url;
    } catch {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your Plus subscription</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!userStatus.isPremium ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
            <p className="text-gray-600 mb-6">
              Upgrade to Plus to unlock premium features and unlimited matches.
            </p>
            <a
              href="/upgrade"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              View Plans
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 capitalize">
                    {userStatus.premiumTier} Plan
                  </h2>
                  {trial.isTrial && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      Free Trial • {trial.daysRemaining} days left
                    </span>
                  )}
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  userStatus.premiumExpiresAt && new Date(userStatus.premiumExpiresAt) < new Date()
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentSubscription?.cancelAtPeriodEnd ? 'Cancelling' : 'Active'}
                </span>
              </div>

              {currentSubscription && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium">${currentSubscription.amount}/{currentSubscription.interval}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Next billing</p>
                    <p className="font-medium">
                      {currentSubscription.currentPeriodEnd
                        ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleManageBilling}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Manage Billing
                </button>
                {currentSubscription?.cancelAtPeriodEnd ? (
                  <button
                    onClick={handleReactivate}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {features && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(features).map(([key, value]) => {
                    if (typeof value === 'boolean' && value) {
                      return (
                        <div key={key} className="flex items-center text-sm text-gray-600">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Subscription</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel? You will lose access to premium features at the end of your billing period.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                <option value="too_expensive">Too expensive</option>
                <option value="not_using">Not using enough</option>
                <option value="missing_features">Missing features</option>
                <option value="switching_service">Switching to another service</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
