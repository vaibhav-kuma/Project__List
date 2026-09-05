'use client';

import { useEffect, useState } from 'react';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

interface FriendRequest {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    age: number;
    gender: string;
    isPremium: boolean;
  };
  createdAt: string;
}

export function WhoAddedYou() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/premium/who-added-friend`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 403) {
        setShowUpgrade(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showUpgrade) {
    return (
      <UpgradePrompt
        feature="see-who-added-as-friend"
        plan="plus"
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => window.location.href = '/upgrade'}
      />
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Who Added You</h3>

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {requests.length === 0 ? (
        <p className="text-gray-500 text-sm">No one has added you as a friend yet</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <img
                src={request.user.avatarUrl || '/default-avatar.png'}
                alt={request.user.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{request.user.displayName}</p>
                <p className="text-sm text-gray-500">
                  {request.user.age} • {request.user.gender}
                  {request.user.isPremium && <PremiumBadge size="sm" />}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(request.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
