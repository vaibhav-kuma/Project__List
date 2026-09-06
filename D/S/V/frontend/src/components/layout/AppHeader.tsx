'use client';

import { useAuthStore } from '@/store/authStore';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function AppHeader() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <NotificationBell />
    </header>
  );
}
