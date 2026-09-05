'use client';

import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { OfflineBanner, InstallBanner } from '@/components/pwa/SwipeHandler';

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const {
    isOnline,
    swUpdateAvailable,
    installPrompt,
    installApp,
    updateServiceWorker,
    requestNotifications,
    subscribePush,
    requestCamera,
    requestMicrophone,
  } = usePWA();

  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    if (swUpdateAvailable) {
      setShowUpdateBanner(true);
    }
  }, [swUpdateAvailable]);

  useEffect(() => {
    // Request permissions on first interaction
    const handleFirstInteraction = async () => {
      setShowPermissionPrompt(true);
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  const handleGrantPermissions = async () => {
    await Promise.all([
      requestNotifications(),
      requestCamera(),
      requestMicrophone(),
    ]);
    setShowPermissionPrompt(false);
  };

  return (
    <>
      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} />

      {/* Update Available Banner */}
      {showUpdateBanner && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white py-2 px-4 text-center text-sm z-50">
          <div className="flex items-center justify-center gap-4">
            <span>A new version is available</span>
            <button
              onClick={() => {
                updateServiceWorker();
                setShowUpdateBanner(false);
              }}
              className="px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-medium"
            >
              Update Now
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Install Banner */}
      <InstallBanner onInstall={installApp} />

      {/* Permission Prompt */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Enable Features</h2>
              <p className="text-gray-600 mt-2">
                Grant permissions for the best experience
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Camera</p>
                  <p className="text-sm text-gray-500">For video calls</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Microphone</p>
                  <p className="text-sm text-gray-500">For audio during calls</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Notifications</p>
                  <p className="text-sm text-gray-500">For messages and matches</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPermissionPrompt(false)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Later
              </button>
              <button
                onClick={handleGrantPermissions}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Enable All
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
