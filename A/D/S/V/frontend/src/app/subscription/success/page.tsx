'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const { fetchCurrentSubscription } = useSubscriptionStore();

  useEffect(() => {
    fetchCurrentSubscription();
    const timer = setTimeout(() => {
      router.push('/subscription');
    }, 5000);
    return () => clearTimeout(timer);
  }, [fetchCurrentSubscription, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Plus!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription has been activated. Enjoy unlimited matches and premium features.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">Redirecting to your subscription page...</p>
        </div>

        <button
          onClick={() => router.push('/subscription')}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          Go to Subscription
        </button>
      </div>
    </div>
  );
}
