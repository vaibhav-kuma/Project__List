'use client';

interface VideoControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onNext: () => void;
  onExtend: () => void;
  onEnd: () => void;
  extendRequested: boolean;
  otherUserRequested: boolean;
  timeRemaining: number;
}

export default function VideoControls({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onNext,
  onExtend,
  onEnd,
  extendRequested,
  otherUserRequested,
  timeRemaining,
}: VideoControlsProps) {
  const showExtend = timeRemaining <= 5 && timeRemaining > 0;

  return (
    <div className="bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
      <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
        <button
          onClick={onToggleMute}
          className={`p-3 rounded-full transition ${
            isMuted ? 'bg-red-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <button
          onClick={onToggleCamera}
          className={`p-3 rounded-full transition ${
            isCameraOff ? 'bg-red-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraOff ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        <button
          onClick={onSwitchCamera}
          className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
          title="Switch camera"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {showExtend && !extendRequested && (
          <button
            onClick={onExtend}
            className="px-4 py-3 rounded-full bg-green-600 text-white hover:bg-green-700 transition font-medium"
          >
            Extend +15s
          </button>
        )}

        {extendRequested && (
          <div className="px-4 py-3 rounded-full bg-green-600/50 text-white font-medium animate-pulse">
            Extend requested
          </div>
        )}

        {otherUserRequested && !extendRequested && (
          <div className="px-4 py-3 rounded-full bg-yellow-600 text-white font-medium animate-pulse">
            Wants to extend
          </div>
        )}

        <button
          onClick={onNext}
          className="p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition"
          title="Next match"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onEnd}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
          title="End chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
