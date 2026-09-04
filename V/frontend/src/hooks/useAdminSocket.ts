'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface AdminEvent {
  type: string;
  timestamp: string;
  data: any;
}

interface AdminMetrics {
  [key: string]: any;
}

interface AdminAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

interface UseAdminSocketReturn {
  isConnected: boolean;
  metrics: AdminMetrics;
  events: AdminEvent[];
  alerts: AdminAlert[];
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  clearAlerts: () => void;
  clearEvents: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useAdminSocket(): UseAdminSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics>({});
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(`${API_URL}/admin`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('authenticate', { token });
      socket.emit('subscribe', ['reports', 'sessions', 'users', 'system']);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('authenticated', () => {
      setIsConnected(true);
    });

    socket.on('initial_metrics', (payload: AdminEvent) => {
      setMetrics(payload.data || {});
    });

    socket.on('metrics_update', (payload: AdminEvent) => {
      setMetrics((prev) => ({ ...prev, ...payload.data }));
    });

    socket.on('new_user', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        newUsersToday: (prev.newUsersToday || 0) + 1,
        totalUsers: (prev.totalUsers || 0) + 1,
      }));
    });

    socket.on('new_report', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        pendingReports: (prev.pendingReports || 0) + 1,
        totalReports: (prev.totalReports || 0) + 1,
      }));

      if (payload.data?.severity >= 8) {
        addAlert({
          level: 'critical',
          title: 'High Severity Report',
          message: `New report: ${payload.data.reason} (severity: ${payload.data.severity})`,
        });
      }
    });

    socket.on('report_resolved', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        pendingReports: Math.max(0, (prev.pendingReports || 0) - 1),
        resolvedReports: (prev.resolvedReports || 0) + 1,
      }));
    });

    socket.on('session_start', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        activeSessions: (prev.activeSessions || 0) + 1,
        todaySessions: (prev.todaySessions || 0) + 1,
      }));
    });

    socket.on('session_end', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        activeSessions: Math.max(0, (prev.activeSessions || 0) - 1),
      }));
    });

    socket.on('match_created', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        todayMatches: (prev.todayMatches || 0) + 1,
        totalMatches: (prev.totalMatches || 0) + 1,
      }));
    });

    socket.on('user_banned', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        bannedUsers: (prev.bannedUsers || 0) + 1,
      }));

      addAlert({
        level: 'warning',
        title: 'User Banned',
        message: `User banned: ${payload.data.displayName || payload.data.userId}`,
      });
    });

    socket.on('user_unbanned', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));
      setMetrics((prev) => ({
        ...prev,
        bannedUsers: Math.max(0, (prev.bannedUsers || 0) - 1),
      }));
    });

    socket.on('system_error', (payload: AdminEvent) => {
      setEvents((prev) => [payload, ...prev].slice(0, 100));

      addAlert({
        level: 'critical',
        title: 'System Error',
        message: payload.data.message || 'An error occurred',
      });
    });

    socket.on('system_alert', (payload: AdminEvent) => {
      addAlert({
        level: payload.data.level || 'info',
        title: payload.data.title,
        message: payload.data.message,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addAlert = useCallback((alert: Omit<AdminAlert, 'id' | 'timestamp'>) => {
    const newAlert: AdminAlert = {
      ...alert,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    };
    setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
  }, []);

  const subscribe = useCallback((channels: string[]) => {
    socketRef.current?.emit('subscribe', channels);
  }, []);

  const unsubscribe = useCallback((channels: string[]) => {
    socketRef.current?.emit('unsubscribe', channels);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    isConnected,
    metrics,
    events,
    alerts,
    subscribe,
    unsubscribe,
    clearAlerts,
    clearEvents,
  };
}
