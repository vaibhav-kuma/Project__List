'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';

interface VideoChatProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export default function VideoChat({ videoRef }: VideoChatProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { localStream, remoteStream } = useChatStore();

  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        useChatStore.getState().setLocalStream(stream);
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    setupMedia();

    return () => {
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, videoRef]);

  return (
    <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-4 right-4 w-48 h-36 rounded-lg object-cover border-2 border-white shadow-lg"
      />

      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
        Connected
      </div>
    </div>
  );
}
