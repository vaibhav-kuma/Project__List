import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import redisClient from '../config/redis';
import logger from '../config/logger';

const VERIFICATION_CODE_TTL = 900;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 900;

export class AuthService {
  async register(data: {
    email?: string;
    phone?: string;
    password: string;
    displayName: string;
    age: number;
    gender: string;
    bio?: string;
    parentalConsent?: boolean;
  }) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : {},
          data.phone ? { phone: data.phone } : {},
        ].filter((w) => Object.keys(w).length > 0),
      },
    });

    if (existingUser) {
      throw new Error(data.email ? 'Email already registered' : 'Phone already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash,
          displayName: data.displayName,
          age: data.age,
          gender: data.gender as any,
          bio: data.bio,
          isVerified: false,
          verificationStatus: 'unverified',
          premiumTier: 'free',
        },
        select: {
          id: true,
          email: true,
          phone: true,
          displayName: true,
          age: true,
          gender: true,
          bio: true,
          isVerified: true,
          verificationStatus: true,
          createdAt: true,
        },
      });

      await tx.userPreferences.create({
        data: {
          userId: newUser.id,
          ageRangeMin: Math.max(18, data.age - 5),
          ageRangeMax: data.age + 5,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    if (data.email) {
      await this.sendVerificationCode(data.email, 'email');
    } else if (data.phone) {
      await this.sendVerificationCode(data.phone!, 'phone');
    }

    const token = this.generateToken(user.id);

    logger.info(`User registered: ${user.id}`);

    return { user, token, requiresVerification: true };
  }

  async login(data: { email?: string; phone?: string; password: string; twoFactorCode?: string }) {
    const identifier = data.email || data.phone;
    if (!identifier) {
      throw new Error('Email or phone is required');
    }

    const attemptKey = `login_attempts:${identifier}`;
    const attempts = await redisClient.get(attemptKey);
    if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : {},
          data.phone ? { phone: data.phone } : {},
        ].filter((w) => Object.keys(w).length > 0),
      },
    });

    if (!user || !user.passwordHash) {
      await this.recordFailedAttempt(attemptKey);
      throw new Error('Invalid credentials');
    }

    if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date())) {
      throw new Error('Account is banned');
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      await this.recordFailedAttempt(attemptKey);
      throw new Error('Invalid credentials');
    }

    await redisClient.del(attemptKey);

    if (user.twoFactorEnabled) {
      if (!data.twoFactorCode) {
        return { requiresTwoFactor: true, userId: user.id };
      }

      const valid = await this.verifyTwoFactor(user.id, data.twoFactorCode);
      if (!valid) {
        throw new Error('Invalid two-factor code');
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online', lastActiveAt: new Date() },
    });

    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${user.id}`);

    return {
      user: userWithoutPassword,
      token,
      refreshToken,
    };
  }

  async socialLogin(provider: string, token: string) {
    let profile: any;

    if (provider === 'google') {
      profile = await this.verifyGoogleToken(token);
    } else if (provider === 'apple') {
      profile = await this.verifyAppleToken(token);
    } else {
      throw new Error('Unsupported provider');
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: profile.email },
          { socialAccounts: { has: `${provider}:${profile.sub}` } },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          displayName: profile.name || profile.email.split('@')[0],
          age: 18,
          gender: 'prefer_not_to_say' as any,
          passwordHash: '',
          isVerified: true,
          verificationStatus: 'verified' as any,
          socialAccounts: [`${provider}:${profile.sub}`],
          avatarUrl: profile.picture,
        },
      });

      await prisma.userPreferences.create({
        data: { userId: user.id },
      });

      await prisma.userProfile.create({
        data: { userId: user.id },
      });
    }

    const jwtToken = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token: jwtToken, refreshToken };
  }

  async sendVerificationCode(identifier: string, type: 'email' | 'phone') {
    const code = crypto.randomInt(100000, 999999).toString();
    const key = `verification:${type}:${identifier}`;

    await redisClient.set(key, code, { EX: VERIFICATION_CODE_TTL });

    if (type === 'email') {
      await this.sendEmailVerification(identifier, code);
    } else {
      await this.sendSmsVerification(identifier, code);
    }

    return { success: true, message: `Verification code sent to ${type}` };
  }

  async verifyEmail(data: { email: string; code: string }) {
    const key = `verification:email:${data.email}`;
    const storedCode = await redisClient.get(key);

    if (!storedCode || storedCode !== data.code) {
      throw new Error('Invalid or expired verification code');
    }

    await redisClient.del(key);

    const user = await prisma.user.update({
      where: { email: data.email },
      data: {
        isVerified: true,
        verificationStatus: 'verified',
        verificationDate: new Date(),
      },
      select: {
        id: true,
        email: true,
        isVerified: true,
        verificationStatus: true,
      },
    });

    logger.info(`Email verified: ${data.email}`);

    return { user, message: 'Email verified successfully' };
  }

  async verifyPhone(data: { phone: string; code: string }) {
    const key = `verification:phone:${data.phone}`;
    const storedCode = await redisClient.get(key);

    if (!storedCode || storedCode !== data.code) {
      throw new Error('Invalid or expired verification code');
    }

    await redisClient.del(key);

    const user = await prisma.user.update({
      where: { phone: data.phone },
      data: {
        isVerified: true,
        verificationStatus: 'verified',
        verificationDate: new Date(),
      },
      select: {
        id: true,
        phone: true,
        isVerified: true,
        verificationStatus: true,
      },
    });

    logger.info(`Phone verified: ${data.phone}`);

    return { user, message: 'Phone verified successfully' };
  }

  async setupTwoFactor(userId: string) {
    const secret = crypto.randomBytes(20).toString('base64').replace(/=/g, '').replace(/\+/g, '').replace(/\//g, '');
    const otpauthUrl = `otpauth://totp/VideoChat:${userId}?secret=${secret}&issuer=VideoChat`;

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, otpauthUrl };
  }

  async enableTwoFactor(userId: string, token: string) {
    const valid = await this.verifyTwoFactor(userId, token);
    if (!valid) {
      throw new Error('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    logger.info(`2FA enabled for user: ${userId}`);

    return { message: 'Two-factor authentication enabled' };
  }

  async disableTwoFactor(userId: string, token: string) {
    const valid = await this.verifyTwoFactor(userId, token);
    if (!valid) {
      throw new Error('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    logger.info(`2FA disabled for user: ${userId}`);

    return { message: 'Two-factor authentication disabled' };
  }

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new Error('Cannot change password for social login accounts');
    }

    const validPassword = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Password changed for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    gender?: string;
    avatarUrl?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        gender: data.gender as any,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        age: true,
        gender: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        status: true,
      },
    });

    return { user };
  }

  async updatePrivacySettings(userId: string, settings: {
    showAge?: boolean;
    showGender?: boolean;
    showLocation?: boolean;
    allowMessagesFrom?: string;
    pushNotifications?: boolean;
    emailNotifications?: boolean;
    matchNotifications?: boolean;
  }) {
    const preferences = await prisma.userPreferences.update({
      where: { userId },
      data: {
        showAge: settings.showAge,
        showGender: settings.showGender,
        showLocation: settings.showLocation,
        allowMessagesFrom: settings.allowMessagesFrom,
        pushNotifications: settings.pushNotifications,
        emailNotifications: settings.emailNotifications,
        matchNotifications: settings.matchNotifications,
      },
    });

    return { preferences };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        age: true,
        gender: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        premiumTier: true,
        premiumExpiresAt: true,
        verificationStatus: true,
        twoFactorEnabled: true,
        status: true,
        totalSessions: true,
        totalFriends: true,
        createdAt: true,
        profile: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { user };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true, phone: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.passwordHash) {
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        throw new Error('Invalid password');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          status: 'offline',
          email: user.email ? `deleted_${Date.now()}_${user.email}` : null,
          phone: user.phone ? `deleted_${Date.now()}_${user.phone}` : null,
          displayName: 'Deleted User',
          bio: null,
          avatarUrl: null,
        },
      });

      await tx.notification.deleteMany({
        where: { userId },
      });
    });

    logger.info(`Account deleted: ${userId}`);

    return { message: 'Account deleted successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isBanned: true, banExpiresAt: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date())) {
        throw new Error('Account is banned');
      }

      const newToken = this.generateToken(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id);

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId: userId }, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any,
    }) as string;
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId: userId }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '7d' as any,
    }) as string;
  }

  private async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      return false;
    }

    try {
      const { default: speakeasy } = await import('speakeasy');
      return speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 1,
      });
    } catch {
      return false;
    }
  }

  private async recordFailedAttempt(key: string) {
    const attempts = await redisClient.get(key);
    const newCount = attempts ? parseInt(attempts) + 1 : 1;
    await redisClient.set(key, newCount.toString(), { EX: LOGIN_ATTEMPT_WINDOW });
  }

  private async verifyGoogleToken(token: string) {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const data = await response.json() as any;

    if (data.error) {
      throw new Error('Invalid Google token');
    }

    return {
      sub: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  private async verifyAppleToken(token: string) {
    const { default: jwt } = await import('jsonwebtoken');
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new Error('Invalid Apple token');
    }

    return {
      sub: (decoded.payload as any).sub,
      email: (decoded.payload as any).email,
      name: (decoded.payload as any).name,
    };
  }

  private async sendEmailVerification(email: string, code: string) {
    logger.info(`Email verification code for ${email}: ${code}`);
  }

  private async sendSmsVerification(phone: string, code: string) {
    logger.info(`SMS verification code for ${phone}: ${code}`);
  }
}
