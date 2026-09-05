'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  requestPushNotifications,
  subscribeToPushNotifications,
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  setupInstallPrompt,
  triggerInstallPrompt,
  InstallPromptEvent,
  isStandalone,
  isMobileDevice,
  isLowBandwidth,
  getNetworkInfo,
} from '@/lib/pwa';

interface PWAState {
  isOnline: boolean;
  isStandalone: boolean;
  isMobile: boolean;
  isLowBandwidth: boolean;
  networkInfo: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  swInstalled: boolean;
  swUpdateAvailable: boolean;
  pushSupported: boolean;
  pushSubscribed: boolean;
  installPrompt: InstallPromptEvent | null;
  permissions: {
    camera: boolean | null;
    microphone: boolean | null;
    location: boolean | null;
    notifications: boolean | null;
  };
}

interface UsePWAReturn extends PWAState {
  installApp: () => Promise<boolean>;
  requestNotifications: () => Promise<boolean>;
  subscribePush: () => Promise<boolean>;
  requestCamera: () => Promise<boolean>;
  requestMicrophone: () => Promise<boolean>;
  requestLocation: () => Promise<boolean>;
  updateServiceWorker: () => void;
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isStandalone: false,
    isMobile: false,
    isLowBandwidth: false,
    networkInfo: { effectiveType: '4g', downlink: 10, rtt: 100, saveData: false },
    swInstalled: false,
    swUpdateAvailable: false,
    pushSupported: false,
    pushSubscribed: false,
    installPrompt: null,
    permissions: {
      camera: null,
      microphone: null,
      location: null,
      notifications: null,
    },
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isStandalone: isStandalone(),
      isMobile: isMobileDevice(),
      isLowBandwidth: isLowBandwidth(),
      networkInfo: getNetworkInfo(),
      pushSupported: 'PushManager' in window,
    }));

    registerServiceWorker().then((reg) => {
      if (reg) {
        setState((prev) => ({ ...prev, swInstalled: true }));
      }
    });

    setupInstallPrompt((promptEvent) => {
      setState((prev) => ({ ...prev, installPrompt: promptEvent }));
    });

    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));
    const handleUpdate = () => setState((prev) => ({ ...prev, swUpdateAvailable: true }));
    const handleConnectionChange = () => {
      setState((prev) => ({
        ...prev,
        isLowBandwidth: isLowBandwidth(),
        networkInfo: getNetworkInfo(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sw-update-available', handleUpdate);

    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-update-available', handleUpdate);

      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!state.installPrompt) return false;
    const result = await triggerInstallPrompt(state.installPrompt);
    if (result) {
      setState((prev) => ({ ...prev, installPrompt: null }));
    }
    return result;
  }, [state.installPrompt]);

  const requestNotifications = useCallback(async () => {
    const granted = await requestPushNotifications();
    setState((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, notifications: granted },
    }));
    return granted;
  }, []);

  const subscribePush = useCallback(async () => {
    const subscription = await subscribeToPushNotifications();
    if (subscription) {
      setState((prev) => ({ ...prev, pushSubscribed: true }));

      try {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      } catch (error) {
        console.error('Failed to save push subscription:', error);
      }
    }
    return !!subscription;
  }, []);

  const requestCamera = useCallback(async () => {
    const granted = await requestCameraPermission();
    setState((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, camera: granted },
    }));
    return granted;
  }, []);

  const requestMicrophone = useCallback(async () => {
    const granted = await requestMicrophonePermission();
    setState((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, microphone: granted },
    }));
    return granted;
  }, []);

  const requestLocation = useCallback(async () => {
    const granted = await requestLocationPermission();
    setState((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, location: granted },
    }));
    return granted;
  }, []);

  const updateServiceWorker = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, []);

  return {
    ...state,
    installApp,
    requestNotifications,
    subscribePush,
    requestCamera,
    requestMicrophone,
    requestLocation,
    updateServiceWorker,
  };
}
