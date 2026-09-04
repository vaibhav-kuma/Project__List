'use client';

import { ConnectionStats } from '@/lib/webrtc';

interface ConnectionQualityProps {
  stats: ConnectionStats | null;
}

export default function ConnectionQuality({ stats }: ConnectionQualityProps) {
  if (!stats) return null;

  const getQualityColor = () => {
    const loss = stats.packetLoss;
    if (loss < 5) return 'text-green-400';
    if (loss < 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityIcon = () => {
    const loss = stats.packetLoss;
    if (loss < 5) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      );
    }
    if (loss < 15) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5z" />
      </svg>
    );
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
      <span className={getQualityColor()}>{getQualityIcon()}</span>
      <span className="text-white/80">{stats.resolution}</span>
      {stats.fps > 0 && (
        <span className="text-white/60">{stats.fps}fps</span>
      )}
    </div>
  );
}
