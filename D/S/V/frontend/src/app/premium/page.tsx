'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { RewindButton } from '@/components/subscription/RewindButton';
import { WhoAddedYou } from '@/components/subscription/WhoAddedYou';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

interface RecentMatch {
  id: string;
  matchedUser: {
    id: string;
    displayName: string;
    avatarUrl: string;
    age: number;
    gender: string;
    isPremium: boolean;
  };
  matchedAt: string;
  duration: number;
}

interface DailyStats {
  todayMatches: number;
  totalMatches: number;
  dailyLimit: number;
  canMatchMore: boolean;
}

export default function PremiumPage() {
  const router = useRouter();
  const { userStatus, loading: subLoading, fetchCurrentSubscription } = useSubscriptionStore();
  const [mounted, setMounted] = useState(false);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'who-added'>('overview');

  useEffect(() => {
    setMounted(true);
    fetchCurrentSubscription();
  }, [fetchCurrentSubscription]);

  useEffect(() => {
    if (mounted && !userStatus.isPremium && !subLoading) {
      router.replace('/upgrade');
    } else if (userStatus.isPremium) {
      fetchPremiumData();
    }
  }, [mounted, userStatus.isPremium, subLoading]);

  function fetchPremiumData() {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

        const [matchesRes, statsRes] = await Promise.all([
          fetch(`${baseUrl}/premium/recent-matches?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${baseUrl}/premium/daily-stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!matchesRes.ok) throw new Error('Failed to fetch recent matches');
        if (!statsRes.ok) throw new Error('Failed to fetch daily stats');

        const matchesData = await matchesRes.json();
        const statsData = await statsRes.json();

        setRecentMatches(matchesData.matches || []);
        setDailyStats(statsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }

  const handleRewind = (sessionId: string) => {
    window.location.href = `/video/${sessionId}`;
  };

  if (!mounted || subLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'matches' as const, label: 'Recent Matches', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'who-added' as const, label: 'Who Added You', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-white">Premium Dashboard</h1>
            <p className="text-sm text-gray-400">{userStatus.premiumTier} plan</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-[#1a1a24] rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#252535]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {dailyStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a3a]">
                      <p className="text-sm text-gray-400 mb-1">Today&apos;s Matches</p>
                      <p className="text-3xl font-bold text-white">{dailyStats.todayMatches}</p>
                    </div>
                    <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a3a]">
                      <p className="text-sm text-gray-400 mb-1">Total Matches</p>
                      <p className="text-3xl font-bold text-white">{dailyStats.totalMatches}</p>
                    </div>
                    <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a3a]">
                      <p className="text-sm text-gray-400 mb-1">Daily Limit</p>
                      <p className="text-3xl font-bold text-white">{dailyStats.dailyLimit}</p>
                    </div>
                  </div>
                )}

                {recentMatches.length > 0 && (
                  <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a3a]">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent Matches</h2>
                    <div className="space-y-3">
                      {recentMatches.slice(0, 5).map((match) => (
                        <div key={match.id} className="flex items-center gap-3 p-3 bg-[#252535] rounded-lg">
                          <img
                            src={match.matchedUser.avatarUrl || '/default-avatar.png'}
                            alt={match.matchedUser.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{match.matchedUser.displayName}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(match.matchedAt).toLocaleDateString()} · {(match.duration / 60).toFixed(0)} min
                            </p>
                          </div>
                          <RewindButton matchId={match.id} onRewind={handleRewind} />
                        </div>
                      ))}
                    </div>
                    {recentMatches.length > 5 && (
                      <button
                        onClick={() => setActiveTab('matches')}
                        className="mt-3 text-sm text-purple-400 hover:text-purple-300"
                      >
                        View all ({recentMatches.length} matches)
                      </button>
                    )}
                  </div>
                )}

                <WhoAddedYou />
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a3a]">
                <h2 className="text-lg font-semibold text-white mb-4">All Recent Matches</h2>
                {recentMatches.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">No matches yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentMatches.map((match) => (
                      <div key={match.id} className="flex items-center gap-3 p-3 bg-[#252535] rounded-lg">
                        <img
                          src={match.matchedUser.avatarUrl || '/default-avatar.png'}
                          alt={match.matchedUser.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{match.matchedUser.displayName}</p>
                          <p className="text-sm text-gray-400">
                            {match.matchedUser.age} · {match.matchedUser.gender}
                            {match.matchedUser.isPremium && <PremiumBadge size="sm" />}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(match.matchedAt).toLocaleDateString()} · {(match.duration / 60).toFixed(0)} min
                          </p>
                        </div>
                        <RewindButton matchId={match.id} onRewind={handleRewind} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'who-added' && (
              <WhoAddedYou />
            )}
          </>
        )}
      </div>
    </div>
  );
}
