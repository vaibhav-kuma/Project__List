'use client';

import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export function SubscriptionBanner() {
  const { userStatus, trial, fetchCurrentSubscription } = useSubscriptionStore();
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchCurrentSubscription();
  }, [fetchCurrentSubscription]);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('subscription-banner-dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('subscription-banner-dismissed', Date.now().toString());
  };

  const handleUpgrade = () => {
    window.location.href = '/upgrade';
  };

  if (!visible || dismissed) return null;
  if (userStatus.isPremium) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              {trial.isTrial && trial.daysRemaining > 0 ? (
                <p className="font-medium">
                  Your free trial ends in {trial.daysRemaining} {trial.daysRemaining === 1 ? 'day' : 'days'}
                </p>
              ) : (
                <p className="font-medium">
                  Unlock unlimited matches and premium features with Plus
                </p>
              )}
              <p className="text-sm text-purple-200">
                Starting at $9.99/month • 7-day free trial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpgrade}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
            >
              Upgrade Now
            </button>
            <button
              onClick={handleDismiss}
              className="text-purple-200 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
