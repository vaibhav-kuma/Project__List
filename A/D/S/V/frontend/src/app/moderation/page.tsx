'use client';

import { useEffect, useState } from 'react';
import { useModerationStore } from '@/store/moderationStore';
import { ReportQueue } from '@/components/moderation/ReportQueue';
import { DashboardStats } from '@/components/moderation/DashboardStats';
import { PendingAppeals } from '@/components/moderation/PendingAppeals';
import { BannedUsersList } from '@/components/moderation/BannedUsersList';
import { MLStatsPanel } from '@/components/moderation/MLStatsPanel';
import { ModerationLogs } from '@/components/moderation/ModerationLogs';

type TabType = 'dashboard' | 'queue' | 'appeals' | 'banned' | 'logs' | 'ml';

export default function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { fetchDashboard, loading, error, clearError } = useModerationStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'queue', label: 'Report Queue', icon: '📋' },
    { id: 'appeals', label: 'Appeals', icon: '⚖️' },
    { id: 'banned', label: 'Banned Users', icon: '🚫' },
    { id: 'logs', label: 'Action Logs', icon: '📝' },
    { id: 'ml', label: 'ML Settings', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
          <p className="text-sm text-gray-500 mt-1">Manage reports, appeals, and user actions</p>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-700">{error}</p>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        </div>
      )}

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex space-x-1 bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardStats />}
            {activeTab === 'queue' && <ReportQueue />}
            {activeTab === 'appeals' && <PendingAppeals />}
            {activeTab === 'banned' && <BannedUsersList />}
            {activeTab === 'logs' && <ModerationLogs />}
            {activeTab === 'ml' && <MLStatsPanel />}
          </>
        )}
      </main>
    </div>
  );
}
