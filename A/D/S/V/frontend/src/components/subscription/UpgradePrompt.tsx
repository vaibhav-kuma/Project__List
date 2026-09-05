'use client';

import { useState } from 'react';

interface UpgradePromptProps {
  feature: string;
  plan: string;
  onClose: () => void;
  onUpgrade: () => void;
}

export function UpgradePrompt({ feature, plan, onClose, onUpgrade }: UpgradePromptProps) {
  const [showDetails, setShowDetails] = useState(false);

  const featureDescriptions: Record<string, { title: string; description: string; icon: string }> = {
    'advanced-filters': {
      title: 'Advanced Filters',
      description: 'Filter by location, interests, and more to find your perfect match.',
      icon: '🎯',
    },
    'unlimited-rewinds': {
      title: 'Unlimited Rewinds',
      description: 'Go back and reconnect with any previous match, unlimited times.',
      icon: '⏪',
    },
    'priority-matching': {
      title: 'Priority Matching',
      description: 'Get matched faster and appear higher in other users queues.',
      icon: '⚡',
    },
    'see-who-added-as-friend': {
      title: 'See Who Added You',
      description: 'See exactly who has added you as a friend before you decide.',
      icon: '👀',
    },
    'ad-free': {
      title: 'Ad-Free Experience',
      description: 'Enjoy the app without any interruptions from advertisements.',
      icon: '✨',
    },
    'hd-video': {
      title: 'HD Video Quality',
      description: 'Crystal clear video calls with HD quality.',
      icon: '📹',
    },
    'exclusive-filters': {
      title: 'Exclusive Filters',
      description: 'Access premium-only filters and stickers.',
      icon: '🎨',
    },
    'incognito-mode': {
      title: 'Incognito Mode',
      description: 'Browse profiles without being seen.',
      icon: '🕵️',
    },
    'passport': {
      title: 'Passport Feature',
      description: 'Match with people anywhere in the world.',
      icon: '🌍',
    },
  };

  const info = featureDescriptions[feature] || {
    title: 'Premium Feature',
    description: 'This feature is available with a Plus subscription.',
    icon: '⭐',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-4xl">{info.icon}</span>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h3 className="text-xl font-bold mt-4">{info.title}</h3>
          <p className="text-blue-100 mt-1">{info.description}</p>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Plus includes:</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> Unlimited matches
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> Advanced filters
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> Unlimited rewinds
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> Ad-free experience
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span> Priority matching
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">$9.99</p>
              <p className="text-sm text-gray-500">/month</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600 font-medium">7-day free trial</p>
              <p className="text-xs text-gray-400">Cancel anytime</p>
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Upgrade to Plus
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 mt-2"
          >
            {showDetails ? 'Hide' : 'View'} all features
          </button>

          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span> HD video quality
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span> Exclusive filters & stickers
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span> See who added you as friend
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span> Read receipts
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
