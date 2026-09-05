'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChatSocket } from '@/store/chatSocket';
import { useWebRTCChat } from '@/hooks/useWebRTCChat';
import VideoControls from '@/components/chat/VideoControls';
import SessionTimer from '@/components/chat/SessionTimer';
import ConnectionQuality from '@/components/chat/ConnectionQuality';
import ExtendPrompt from '@/components/chat/ExtendPrompt';

export default function VideoSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const router = useRouter();
  const { connect, disconnect, matchStatus, matchedUser, otherUserRequestedExtend, requestExtend, acceptExtend, endSession } = useChatSocket();
  const { localVideoRef, remoteVideoRef, localStream, remoteStream, connectionState, connectionStats, isMuted, isCameraOff, error, initialize, connectToPeer, toggleMute, toggleCamera, switchCamera, cleanup } = useWebRTCChat();
  const [timeRemaining, setTimeRemaining] = useState(15);

  useEffect(() => {
    initialize();
    return () => cleanup();
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Invalid session</p>
          <button onClick={() => router.push('/video-chat')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Go to Video Chat</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 relative overflow-hidden">
      <div className="relative w-full h-screen">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
              <p className="text-white text-xl">Reconnecting...</p>
            </div>
          </div>
        )}
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-gray-800" style={{ transform: 'scaleX(-1)' }} />
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-white font-medium">{matchedUser?.displayName || 'Stranger'}</p>
        </div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <SessionTimer timeRemaining={timeRemaining} isExtended={false} />
        </div>
        {error && <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">{error}</div>}
        <div className="absolute bottom-0 left-0 right-0">
          <VideoControls isMuted={isMuted} isCameraOff={isCameraOff} onToggleMute={toggleMute} onToggleCamera={toggleCamera} onSwitchCamera={switchCamera} onNext={() => router.push('/video-chat')} onExtend={requestExtend} onEnd={() => router.push('/video-chat')} extendRequested={false} otherUserRequested={otherUserRequestedExtend} timeRemaining={timeRemaining} />
        </div>
      </div>
    </main>
  );
}
