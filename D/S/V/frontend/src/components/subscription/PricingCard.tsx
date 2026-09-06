'use client';

import { Plan } from '@/store/subscriptionStore';

interface PricingCardProps {
  plan: Plan;
  interval: 'month' | 'year';
  isCurrentPlan: boolean;
  onSubscribe: (planId: string) => void;
}

export function PricingCard({ plan, interval, isCurrentPlan, onSubscribe }: PricingCardProps) {
  const price = interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice;
  const monthlyEquivalent = interval === 'year' ? (plan.yearlyPrice / 12).toFixed(2) : price.toFixed(2);

  return (
    <div className={`relative rounded-2xl border-2 p-6 flex flex-col ${
      plan.popular
        ? 'border-blue-500 shadow-lg bg-white'
        : 'border-gray-200 bg-white'
    }`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
      </div>

      <div className="mb-6">
        {price > 0 ? (
          <>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">${monthlyEquivalent}</span>
              <span className="text-gray-500 ml-1">/month</span>
            </div>
            {interval === 'year' && (
              <p className="text-sm text-gray-500 mt-1">
                Billed ${plan.yearlyPrice}/year
              </p>
            )}
            {plan.yearlySavings > 0 && interval === 'year' && (
              <p className="text-sm text-green-600 font-medium mt-1">
                Save {plan.yearlySavings}% annually
              </p>
            )}
          </>
        ) : (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">Free</span>
          </div>
        )}
      </div>

      {plan.trialDays > 0 && (
        <div className="mb-4 bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-700 font-medium">
            {plan.trialDays}-day free trial
          </p>
          <p className="text-xs text-blue-600">No commitment, cancel anytime</p>
        </div>
      )}

      <ul className="space-y-3 mb-6 flex-1">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSubscribe(plan.id)}
        disabled={isCurrentPlan || plan.id === 'free'}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          isCurrentPlan || plan.id === 'free'
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : plan.popular
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        {isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : 'Start Free Trial'}
      </button>
    </div>
  );
}
