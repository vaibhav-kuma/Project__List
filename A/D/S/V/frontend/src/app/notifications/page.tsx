'use client';

import { useEffect, useState } from 'react';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { Bell, CheckCheck, Trash2, Loader2, ArrowLeft, Inbox, Filter } from 'lucide-react';
import Link from 'next/link';

const NOTIFICATION_ICONS: Record<string, string> = {
  match: '🤝',
  friend_request: '👋',
  friend_accept: '✅',
  moment_like: '❤️',
  moment_reply: '💬',
  message: '💌',
  system: '🔔',
  moderation: '⚠️',
  subscription: '⭐',
  verification: '📧',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationRow({ notification, onMarkRead, onDelete }: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex gap-4 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
    >
      <span className="text-2xl">{NOTIFICATION_ICONS[notification.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''} text-gray-900 dark:text-gray-100`}>
              {notification.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
            {formatTime(notification.createdAt)}
          </span>
        </div>
        <div className="flex gap-2 mt-2">
          {!notification.isRead && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark read
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    initialized,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteOldNotifications,
  } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      fetchNotifications();
    }
  }, [user, initialized, fetchNotifications]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Sign in to view notifications</h2>
          <Link href="/" className="text-blue-500 hover:text-blue-600">Go to login</Link>
        </div>
      </div>
    );
  }

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-500 hover:text-blue-600 px-3 py-1.5 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    setDeleting(true);
                    await deleteOldNotifications(30);
                    setDeleting(false);
                  }}
                  disabled={deleting}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  {deleting ? 'Cleaning...' : 'Clean old'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 px-4 pb-3">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" /> All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Unread
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900">
          {loading && notifications.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm mt-1">No notifications {filter === 'unread' ? 'unread' : 'yet'}</p>
            </div>
          )}

          {filtered.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}
        </div>

        {!loading && notifications.length > 20 && (
          <div className="text-center py-4">
            <button
              onClick={() => fetchNotifications({ limit: notifications.length + 20 })}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
