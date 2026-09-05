export interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function requestPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ) as BufferSource,
    });

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function requestCameraPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  });
}

export interface InstallPromptEvent {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function setupInstallPrompt(
  onPromptReady: (promptEvent: InstallPromptEvent) => void
): void {
  if (typeof window === 'undefined') return;

  let deferredPrompt: InstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as unknown as InstallPromptEvent;
    if (deferredPrompt) {
      onPromptReady(deferredPrompt);
    }
  });
}

export async function triggerInstallPrompt(promptEvent: InstallPromptEvent): Promise<boolean> {
  if (!promptEvent) return false;

  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  return outcome === 'accepted';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    window.innerWidth <= 768
  );
}

export function isLowBandwidth(): boolean {
  if (typeof window === 'undefined' || !navigator.connection) return false;

  const connection = navigator.connection as any;
  return connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

export function getNetworkInfo(): {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
} {
  if (typeof window === 'undefined' || !navigator.connection) {
    return { effectiveType: '4g', downlink: 10, rtt: 100, saveData: false };
  }

  const connection = navigator.connection as any;
  return {
    effectiveType: connection.effectiveType || '4g',
    downlink: connection.downlink || 10,
    rtt: connection.rtt || 100,
    saveData: connection.saveData || false,
  };
}
