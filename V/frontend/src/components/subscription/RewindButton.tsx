'use client';

import { useState } from 'react';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';

interface RewindButtonProps {
  matchId: string;
  onRewind: (sessionId: string) => void;
  disabled?: boolean;
}

export function RewindButton({ matchId, onRewind, disabled }: RewindButtonProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRewind = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/premium/rewind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId }),
      });

      if (response.status === 403) {
        setShowUpgrade(true);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rewind');
      }

      const data = await response.json();
      onRewind(data.sessionId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleRewind}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </svg>
        {loading ? 'Rewinding...' : 'Rewind'}
      </button>

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}

      {showUpgrade && (
        <UpgradePrompt
          feature="rewind"
          plan="plus"
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => window.location.href = '/upgrade'}
        />
      )}
    </>
  );
}
