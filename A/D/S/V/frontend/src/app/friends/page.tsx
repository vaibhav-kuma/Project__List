'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useFriendsStore } from '@/store/friendsStore';
import { UserSearch } from '@/components/search/UserSearch';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import BottomNav from '@/components/ui/BottomNav';

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuthStore();
  const { friends, pendingReceived, pendingSent, loading, fetchFriends, fetchPending, acceptRequest, rejectRequest, removeFriend, sendRequest, blockUser, unblockUser, startCall } = useFriendsStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'search'>('friends');
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPending();
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold text-white">Friends</h1>
        <div className="w-6" />
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
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'pending'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Pending ({pendingReceived.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'search'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Search
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {activeTab === 'search' ? (
          <UserSearch
            onSendRequest={async (userId) => {
              setSendingTo(userId);
              try {
                await sendRequest(userId);
                setSendingTo(null);
              } catch {
                setSendingTo(null);
              }
            }}
            sendingTo={sendingTo}
          />
        ) : activeTab === 'friends' ? (
          loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-6xl mb-4">👥</div>
              <h2 className="text-xl font-semibold text-white mb-2">No friends yet</h2>
              <p className="text-gray-400">Match with people and add them as friends!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center gap-3"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                        friend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate flex items-center gap-1">
                      {friend.displayName}
                      {friend.isPremium && <PremiumBadge />}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {friend.chatCount} chats
                      {friend.lastChatAt && ` • Last: ${new Date(friend.lastChatAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {friend.isFavorite && (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    <button
                      onClick={() => startCall(friend.id)}
                      className="text-gray-400 hover:text-indigo-400 p-1"
                      title="Call friend"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === friend.id ? null : friend.id)}
                        className="text-gray-400 hover:text-white p-1"
                        title="More"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                      </button>
                      {openMenu === friend.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1" ref={menuRef}>
                          <button
                            onClick={() => { blockUser(friend.id); setOpenMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Block
                          </button>
                          <button
                            onClick={() => { removeFriend(friend.id); setOpenMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {pendingReceived.length === 0 && pendingSent.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-6xl mb-4">📬</div>
                <h2 className="text-xl font-semibold text-white mb-2">No pending requests</h2>
              </div>
            ) : (
              <>
                {pendingReceived.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Received</h3>
                    <div className="space-y-2">
                      {pendingReceived.map((request) => (
                        <div
                          key={request.id}
                          className="bg-gray-800 rounded-lg p-4 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                            {request.user.avatarUrl ? (
                              <img src={request.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              request.user.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium flex items-center gap-1">
                              {request.user.displayName}
                              {request.user.isPremium && <PremiumBadge />}
                            </p>
                            <p className="text-gray-400 text-xs">{new Date(request.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => rejectRequest(request.id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingSent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Sent</h3>
                    <div className="space-y-2">
                      {pendingSent.map((request) => (
                        <div
                          key={request.id}
                          className="bg-gray-800 rounded-lg p-4 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                            {request.user.avatarUrl ? (
                              <img src={request.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              request.user.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium flex items-center gap-1">
                              {request.user.displayName}
                              {request.user.isPremium && <PremiumBadge />}
                            </p>
                            <p className="text-gray-400 text-xs">Pending...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
