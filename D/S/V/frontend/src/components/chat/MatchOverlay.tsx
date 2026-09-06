'use client';

interface MatchOverlayProps {
  totalMatches: number;
}

export default function MatchOverlay({ totalMatches }: MatchOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 via-gray-900/90 to-blue-900/80">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Finding someone...</h2>
        <p className="text-white/60 text-lg mb-6">
          {totalMatches > 0 ? `Match #${totalMatches + 1}` : 'Your first match'}
        </p>

        <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
