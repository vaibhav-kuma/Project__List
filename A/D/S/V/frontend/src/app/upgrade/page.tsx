'use client';

import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { PricingCard } from '@/components/subscription/PricingCard';
import { FAQSection } from '@/components/subscription/FAQSection';

export default function UpgradePage() {
  const { plans, fetchPlans, fetchCurrentSubscription, userStatus, loading, error } = useSubscriptionStore();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, [fetchPlans, fetchCurrentSubscription]);

  const handleSubscribe = async (planId: string) => {
    const { createCheckoutSession } = useSubscriptionStore.getState();
    try {
      const { url } = await createCheckoutSession({
        planId,
        interval: billingInterval,
        useTrial: true,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/upgrade`,
      });
      window.location.href = url;
    } catch {
    }
  };

  const handleManageBilling = async () => {
    const { createBillingPortalSession } = useSubscriptionStore.getState();
    try {
      const { url } = await createBillingPortalSession(`${window.location.origin}/subscription`);
      window.location.href = url;
    } catch {
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Upgrade to Plus</h1>
          <p className="text-gray-600 mt-2">Unlock premium features and unlimited matches</p>
        </div>
      </header>

      {userStatus.isPremium && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-green-800 font-medium">You are currently on {userStatus.premiumTier}</p>
              <p className="text-green-600 text-sm">
                {userStatus.premiumExpiresAt
                  ? `Access until ${new Date(userStatus.premiumExpiresAt).toLocaleDateString()}`
                  : 'Active subscription'}
              </p>
            </div>
            <button
              onClick={handleManageBilling}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              Manage Billing
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'year' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Yearly
              <span className="ml-1 text-green-600 text-xs">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              interval={billingInterval}
              isCurrentPlan={userStatus.premiumTier === plan.id}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      </section>

      <FAQSection />
    </div>
  );
}
