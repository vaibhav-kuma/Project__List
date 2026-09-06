'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useMomentsStore } from '@/store/momentsStore';
import StoryViewer from '@/components/moments/StoryViewer';
import MomentCard from '@/components/moments/MomentCard';
import CreateMomentModal from '@/components/moments/CreateMomentModal';
import BottomNav from '@/components/ui/BottomNav';

export default function MomentsPage() {
  const { user, loading: authLoading } = useAuthStore();
  const { moments, discoverMoments, loading, fetchFeed, fetchDiscover } = useMomentsStore();
  const [showCreate, setShowCreate] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'friends' | 'discover'>('friends');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchFeed();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'discover' && user) {
      fetchDiscover();
    }
  }, [activeTab, user]);

  const handleMomentClick = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  const displayMoments = activeTab === 'friends' ? moments : discoverMoments;

  return (
    <main className="min-h-screen bg-gray-900 pb-20">
      <header className="bg-gray-800 p-4 flex justify-between items-center sticky top-0 z-10">
        <button
          onClick={() => router.push('/chat')}
          className="text-gray-300 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Moments</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition text-sm"
        >
          + New
        </button>
      </header>

      <div className="flex border-b border-gray-700 sticky top-14 bg-gray-900 z-10">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'friends'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'discover'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Discover
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : displayMoments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-6xl mb-4">
              {activeTab === 'friends' ? '📸' : '🔍'}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {activeTab === 'friends' ? 'No moments yet' : 'Nothing to discover'}
            </h2>
            <p className="text-gray-400 mb-4">
              {activeTab === 'friends'
                ? 'Share a moment or add friends to see their stories!'
                : 'Popular moments will appear here'}
            </p>
            {activeTab === 'friends' && (
              <button
                onClick={() => setShowCreate(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition"
              >
                Create your first Moment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayMoments.map((moment, index) => (
              <div key={moment.id} onClick={() => handleMomentClick(index)}>
                <MomentCard moment={moment} />
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerOpen && (
        <StoryViewer
          moments={displayMoments}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {showCreate && <CreateMomentModal onClose={() => setShowCreate(false)} />}

      <BottomNav />
    </main>
  );
}
