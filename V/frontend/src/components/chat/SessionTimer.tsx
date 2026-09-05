'use client';

interface SessionTimerProps {
  timeRemaining: number;
  isExtended: boolean;
}

export default function SessionTimer({ timeRemaining, isExtended }: SessionTimerProps) {
  const getColor = () => {
    if (timeRemaining > 10) return 'text-green-400';
    if (timeRemaining > 5) return 'text-yellow-400';
    return 'text-red-400 animate-pulse';
  };

  const getProgress = () => {
    const base = isExtended ? 30 : 15;
    return (timeRemaining / base) * 100;
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={timeRemaining > 10 ? '#4ade80' : timeRemaining > 5 ? '#facc15' : '#f87171'}
            strokeWidth="3"
            strokeDasharray={`${getProgress()}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getColor()}`}>
          {timeRemaining}
        </span>
      </div>
      <div className="text-white/80 text-sm">
        {isExtended ? 'Extended!' : 'remaining'}
      </div>
    </div>
  );
}
