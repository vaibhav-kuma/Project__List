'use client';

import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export function useFeatureAccess(feature: string) {
  const { checkFeatureAccess, userStatus } = useSubscriptionStore();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const access = await checkFeatureAccess(feature);
      setHasAccess(access);
      setLoading(false);
    };
    check();
  }, [feature, checkFeatureAccess]);

  return { hasAccess: hasAccess ?? false, loading, isPremium: userStatus.isPremium, plan: userStatus.premiumTier };
}

export function useSubscription() {
  const { userStatus, currentSubscription, trial, features } = useSubscriptionStore();

  return {
    isPremium: userStatus.isPremium,
    plan: userStatus.premiumTier,
    expiresAt: userStatus.premiumExpiresAt,
    subscription: currentSubscription,
    trial,
    features,
    isTrialActive: trial.isTrial && trial.daysRemaining > 0,
    trialDaysRemaining: trial.daysRemaining,
  };
}

export function withPremiumCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string
) {
  return function WithPremiumCheck(props: P) {
    const { hasAccess, loading } = useFeatureAccess(feature);

    if (loading) {
      return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;
    }

    if (!hasAccess) {
      return (
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-4">This feature requires a Plus subscription</p>
          <a href="/upgrade" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Upgrade to Plus
          </a>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
