import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@yt/database';
import { registerSchema, loginSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from '@yt/shared';
import { config } from '../config';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { email, username, password, displayName } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      throw new AppError('Email or username already taken', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName || username,
        passwordHash,
        channel: {
          create: {
            handle: `@${username}`,
            name: displayName || username,
          },
        },
      },
      select: { id: true, email: true, username: true, role: true },
    });

    const tokenPayload = { id: user.id, email: user.email, username: user.username, role: user.role };
    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: { user, token, refreshToken },
      message: 'Account created successfully',
    });
  } catch (err) { next(err); }
});

authRouter.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokenPayload = { id: user.id, email: user.email, username: user.username, role: user.role };
    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, username: user.username, role: user.role, avatarUrl: user.avatarUrl },
        token,
        refreshToken,
      },
    });
  } catch (err) { next(err); }
});

authRouter.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, username: true, role: true } });
    if (!user) throw new AppError('User not found', 404);

    const tokenPayload = { id: user.id, email: user.email, username: user.username, role: user.role };
    const newToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (err) { next(err); }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, bannerUrl: true, description: true,
        subscriberCount: true, totalViews: true, isVerified: true,
        role: true, channel: true, createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

authRouter.put('/update-profile', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, description: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

authRouter.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
      return;
    }
    const token = generateAccessToken({ id: user.id, email: user.email, username: user.username, role: user.role });

    if (config.smtp.host) {
      // TODO: Send email with nodemailer
      console.log(`Password reset token for ${email}: ${token}`);
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) { next(err); }
});

authRouter.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const decoded = verifyRefreshToken(token);
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: decoded.id }, data: { passwordHash } });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
});
