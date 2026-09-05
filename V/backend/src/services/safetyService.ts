import prisma from '../config/database';
import logger from '../config/logger';
import { Server } from 'socket.io';

export interface SafetyEvent {
  userId?: string;
  sessionId?: string;
  eventType: 'emergency_exit' | 'suspicious_behavior_warning' | 'location_spoofing_detected' | 'safety_tip_shown' | 'block_user' | 'safety_check_triggered';
  severity?: number;
  description?: string;
  metadata?: any;
}

let ioInstance: Server | null = null;

export function setSafetyIO(io: Server) {
  ioInstance = io;
}

function emitToUser(userId: string, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit(event, data);
  }
}

class SafetyService {
  private readonly SUSPICIOUS_WARNING_THRESHOLD = 3;
  private readonly EMERGENCY_COOLDOWN_MS = 5000;

  async logSafetyEvent(event: SafetyEvent): Promise<void> {
    await prisma.safetyEvent.create({
      data: {
        userId: event.userId,
        sessionId: event.sessionId,
        eventType: event.eventType,
        severity: event.severity || 1,
        description: event.description,
        metadata: event.metadata,
      },
    });

    logger.info(`Safety event logged: ${event.eventType} for user ${event.userId}`);
  }

  async handleEmergencyExit(userId: string, sessionId?: string): Promise<{ message: string; emergencyContacts: any[] }> {
    const now = Date.now();

    const recentExits = await prisma.safetyEvent.count({
      where: {
        userId,
        eventType: 'emergency_exit',
        createdAt: { gt: new Date(now - 60 * 60 * 1000) },
      },
    });

    await prisma.safetyEvent.create({
      data: {
        userId,
        sessionId,
        eventType: 'emergency_exit',
        severity: 5,
        description: 'User triggered emergency exit',
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { emergencyExitCount: { increment: 1 } },
    });

    if (sessionId) {
      await prisma.videoSession.updateMany({
        where: { id: sessionId },
        data: { status: 'ended', endedAt: new Date() },
      });

      if (ioInstance) {
        const session = await prisma.videoSession.findUnique({
          where: { id: sessionId },
          select: { user1Id: true, user2Id: true },
        });

        if (session) {
          const otherUserId = session.user1Id === userId ? session.user2Id : session.user1Id;
          emitToUser(otherUserId, 'partner_emergency_exit', { sessionId });
        }
      }
    }

    const emergencyContacts = [
      { name: 'Emergency Services', number: '911', type: 'emergency' },
      { name: 'Crisis Text Line', number: '741741', type: 'crisis' },
      { name: 'National Suicide Prevention', number: '988', type: 'crisis' },
    ];

    return {
      message: 'Emergency exit triggered. Session ended.',
      emergencyContacts,
    };
  }

  async showSafetyTip(userId: string): Promise<{ shown: boolean; tip: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastSafetyTipShown: true, totalSessions: true },
    });

    if (!user) {
      return { shown: false, tip: '' };
    }

    const shouldShow = !user.lastSafetyTipShown || user.totalSessions <= 3;

    if (!shouldShow) {
      return { shown: false, tip: '' };
    }

    const tips = [
      'Never share personal information like your address, phone number, or financial details.',
      'If someone makes you uncomfortable, use the block button immediately.',
      'Trust your instincts - if something feels wrong, end the chat.',
      'Keep conversations on the platform - be wary of users who want to move to other apps quickly.',
      'Report inappropriate behavior. Your reports help keep the community safe.',
      'Be aware that people may not be who they claim to be online.',
      'Never send money or gifts to someone you met online.',
      'If you are under 18, make sure you have parental consent to use this app.',
      'Use the emergency exit button if you feel unsafe at any time.',
      'Remember: you can leave any conversation at any time.',
    ];

    const tip = tips[Math.floor(Math.random() * tips.length)];

    await prisma.user.update({
      where: { id: userId },
      data: { lastSafetyTipShown: new Date() },
    });

    await this.logSafetyEvent({
      userId,
      eventType: 'safety_tip_shown',
      description: tip,
    });

    return { shown: true, tip };
  }

  async warnSuspiciousBehavior(userId: string, sessionId: string, warningType: string): Promise<{ warningCount: number; actionRequired: boolean }> {
    const warningCount = await prisma.safetyEvent.count({
      where: {
        userId,
        eventType: 'suspicious_behavior_warning',
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const newCount = warningCount + 1;

    await this.logSafetyEvent({
      userId,
      sessionId,
      eventType: 'suspicious_behavior_warning',
      severity: newCount,
      description: `Suspicious behavior warning: ${warningType}`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { suspiciousBehaviorWarnings: { increment: 1 } },
    });

    emitToUser(userId, 'suspicious_behavior_warning', {
      warningCount: newCount,
      warningType,
      actionRequired: newCount >= this.SUSPICIOUS_WARNING_THRESHOLD,
    });

    if (newCount >= this.SUSPICIOUS_WARNING_THRESHOLD) {
      await prisma.videoSession.updateMany({
        where: { id: sessionId },
        data: { status: 'ended', endedAt: new Date(), flaggedContent: true },
      });

      return { warningCount: newCount, actionRequired: true };
    }

    return { warningCount: newCount, actionRequired: false };
  }

  async detectLocationSpoofing(userId: string, reportedLocation: any): Promise<{ detected: boolean; action: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locationSpoofingDetected: true },
    });

    if (!reportedLocation || !reportedLocation.latitude || !reportedLocation.longitude) {
      return { detected: false, action: 'none' };
    }

    const isSuspicious =
      reportedLocation.accuracy > 10000 ||
      reportedLocation.latitude === 0 ||
      reportedLocation.longitude === 0 ||
      (reportedLocation.latitude === 37.7749 && reportedLocation.longitude === -122.4194);

    if (isSuspicious && !user?.locationSpoofingDetected) {
      await this.logSafetyEvent({
        userId,
        eventType: 'location_spoofing_detected',
        severity: 2,
        description: 'Potential location spoofing detected',
        metadata: { reportedLocation },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { locationSpoofingDetected: true },
      });

      return { detected: true, action: 'flagged' };
    }

    return { detected: false, action: 'none' };
  }

  async getSafetyStatus(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emergencyExitCount: true,
        suspiciousBehaviorWarnings: true,
        locationSpoofingDetected: true,
        lastSafetyTipShown: true,
        isMinor: true,
        restrictedMode: true,
      },
    });

    const recentEvents = await prisma.safetyEvent.findMany({
      where: {
        userId,
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      user,
      recentEvents,
      safetyScore: this.calculateSafetyScore(user),
    };
  }

  private calculateSafetyScore(user: any): number {
    let score = 100;

    score -= user.emergencyExitCount * 5;
    score -= user.suspiciousBehaviorWarnings * 10;
    if (user.locationSpoofingDetected) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  async getSafetyTips(): Promise<string[]> {
    return [
      'Never share personal information like your address, phone number, or financial details.',
      'If someone makes you uncomfortable, use the block button immediately.',
      'Trust your instincts - if something feels wrong, end the chat.',
      'Keep conversations on the platform - be wary of users who want to move to other apps quickly.',
      'Report inappropriate behavior. Your reports help keep the community safe.',
      'Be aware that people may not be who they claim to be online.',
      'Never send money or gifts to someone you met online.',
      'If you are under 18, make sure you have parental consent to use this app.',
      'Use the emergency exit button if you feel unsafe at any time.',
      'Remember: you can leave any conversation at any time.',
      'Do not share your social media accounts with strangers.',
      'Be cautious about sharing photos that could reveal your location.',
      'If you plan to meet someone in person, do so in a public place.',
      'Tell a friend or family member about your online interactions.',
      'Block and report users who ask for inappropriate content.',
    ];
  }
}

export const safetyService = new SafetyService();
