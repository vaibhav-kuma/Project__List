'use client';

interface ExtendPromptProps {
  onAccept: () => void;
  onDecline: () => void;
  userName: string;
}

export default function ExtendPrompt({ onAccept, onDecline, userName }: ExtendPromptProps) {
  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-700 min-w-[280px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto bg-green-600/20 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">{userName} wants to extend</p>
          <p className="text-white/60 text-sm mb-4">Add 15 more seconds to your chat?</p>

          <div className="flex gap-2">
            <button
              onClick={onDecline}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
            >
              Accept (+15s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
