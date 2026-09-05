import React, { useState } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';

export default function LiveSessionViewer({ viewerUrl, isOpen, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!viewerUrl) return null;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Live Session Viewer</h2>
          <button
            onClick={() => setIsFullscreen(false)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Exit Fullscreen
          </button>
        </div>
        <iframe
          src={viewerUrl}
          title="Live Session Viewer"
          className="flex-1 w-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={onClose ? () => onClose() : undefined}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 z-40"
      >
        <ExternalLink size={18} />
        Watch Live
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl overflow-hidden z-40 w-96 h-96 flex flex-col">
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <h3 className="font-bold">Live Session Viewer</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFullscreen(true)}
            className="hover:bg-blue-700 p-1 rounded"
            title="Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 px-2 py-1 rounded text-sm font-bold"
          >
            ✕
          </button>
        </div>
      </div>
      <iframe
        src={viewerUrl}
        title="Live Session Viewer"
        className="flex-1 w-full border-0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
      <div className="bg-gray-100 p-2 text-xs text-gray-600 border-t">
        <p>🔴 Live — Watch the agent navigate LinkedIn in real-time</p>
      </div>
    </div>
  );
}
