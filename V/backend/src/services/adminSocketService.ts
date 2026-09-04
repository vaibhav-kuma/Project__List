import { Server, Socket } from 'socket.io';
import logger from '../config/logger';

interface AdminSocket extends Socket {
  isAdmin?: boolean;
}

class AdminSocketService {
  private io: Server | null = null;
  private connectedAdmins: Set<string> = new Set();
  private metricsCache: Map<string, any> = new Map();

  initialize(io: Server): void {
    this.io = io;

    const adminNamespace = io.of('/admin');

    adminNamespace.on('connection', (socket: AdminSocket) => {
      logger.info(`Admin connected: ${socket.id}`);
      this.connectedAdmins.add(socket.id);

      socket.on('authenticate', (data: { token: string }) => {
        socket.isAdmin = true;
        socket.emit('authenticated', { success: true });
        this.sendCurrentMetrics(socket);
      });

      socket.on('subscribe', (channels: string[]) => {
        channels.forEach((channel) => {
          socket.join(channel);
        });
        logger.info(`Admin ${socket.id} subscribed to: ${channels.join(', ')}`);
      });

      socket.on('unsubscribe', (channels: string[]) => {
        channels.forEach((channel) => {
          socket.leave(channel);
        });
      });

      socket.on('disconnect', () => {
        this.connectedAdmins.delete(socket.id);
        logger.info(`Admin disconnected: ${socket.id}`);
      });
    });
  }

  emitToAdmins(event: string, data: any): void {
    if (!this.io) return;

    this.io.of('/admin').emit(event, data);
    logger.debug(`Emitted ${event} to ${this.connectedAdmins.size} admins`);
  }

  emitToChannel(channel: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.of('/admin').to(channel).emit(event, data);
  }

  emitNewUser(userData: any): void {
    this.emitToAdmins('new_user', {
      type: 'new_user',
      timestamp: new Date().toISOString(),
      data: userData,
    });

    this.updateMetric('newUsersToday', (prev: number) => prev + 1);
    this.updateMetric('totalUsers', (prev: number) => prev + 1);
  }

  emitNewReport(reportData: any): void {
    this.emitToAdmins('new_report', {
      type: 'new_report',
      timestamp: new Date().toISOString(),
      data: reportData,
    });

    this.updateMetric('pendingReports', (prev: number) => prev + 1);
    this.updateMetric('totalReports', (prev: number) => prev + 1);
  }

  emitReportResolved(reportData: any): void {
    this.emitToAdmins('report_resolved', {
      type: 'report_resolved',
      timestamp: new Date().toISOString(),
      data: reportData,
    });

    this.updateMetric('pendingReports', (prev: number) => Math.max(0, prev - 1));
    this.updateMetric('resolvedReports', (prev: number) => prev + 1);
  }

  emitSessionStart(sessionData: any): void {
    this.emitToAdmins('session_start', {
      type: 'session_start',
      timestamp: new Date().toISOString(),
      data: sessionData,
    });

    this.updateMetric('activeSessions', (prev: number) => prev + 1);
    this.updateMetric('todaySessions', (prev: number) => prev + 1);
  }

  emitSessionEnd(sessionData: any): void {
    this.emitToAdmins('session_end', {
      type: 'session_end',
      timestamp: new Date().toISOString(),
      data: sessionData,
    });

    this.updateMetric('activeSessions', (prev: number) => Math.max(0, prev - 1));
  }

  emitMatchCreated(matchData: any): void {
    this.emitToAdmins('match_created', {
      type: 'match_created',
      timestamp: new Date().toISOString(),
      data: matchData,
    });

    this.updateMetric('todayMatches', (prev: number) => prev + 1);
    this.updateMetric('totalMatches', (prev: number) => prev + 1);
  }

  emitUserBanned(userData: any): void {
    this.emitToAdmins('user_banned', {
      type: 'user_banned',
      timestamp: new Date().toISOString(),
      data: userData,
    });

    this.updateMetric('bannedUsers', (prev: number) => prev + 1);
  }

  emitUserUnbanned(userData: any): void {
    this.emitToAdmins('user_unbanned', {
      type: 'user_unbanned',
      timestamp: new Date().toISOString(),
      data: userData,
    });

    this.updateMetric('bannedUsers', (prev: number) => Math.max(0, prev - 1));
  }

  emitError(errorData: any): void {
    this.emitToAdmins('system_error', {
      type: 'system_error',
      timestamp: new Date().toISOString(),
      data: errorData,
    });
  }

  emitSystemAlert(alertData: {
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    data?: any;
  }): void {
    this.emitToAdmins('system_alert', {
      type: 'system_alert',
      timestamp: new Date().toISOString(),
      data: alertData,
    });
  }

  emitMetricsUpdate(metrics: any): void {
    this.emitToAdmins('metrics_update', {
      type: 'metrics_update',
      timestamp: new Date().toISOString(),
      data: metrics,
    });
  }

  setMetric(key: string, value: any): void {
    this.metricsCache.set(key, value);
  }

  updateMetric(key: string, updater: (prev: any) => any): void {
    const current = this.metricsCache.get(key) || 0;
    this.metricsCache.set(key, updater(current));
  }

  getMetric(key: string): any {
    return this.metricsCache.get(key);
  }

  sendCurrentMetrics(socket: Socket): void {
    const metrics = Object.fromEntries(this.metricsCache);
    socket.emit('initial_metrics', {
      type: 'initial_metrics',
      timestamp: new Date().toISOString(),
      data: metrics,
    });
  }

  getConnectedAdminsCount(): number {
    return this.connectedAdmins.size;
  }

  cleanup(): void {
    this.connectedAdmins.clear();
    this.metricsCache.clear();
  }
}

export const adminSocketService = new AdminSocketService();
