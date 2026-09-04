import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
  updateProfileSchema,
  privacySettingsSchema,
  changePasswordSchema,
  twoFactorSetupSchema,
  deleteAccountSchema,
  socialLoginSchema,
  parentalConsentSchema,
} from '../utils/validation';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    const result = await authService.register({
      email: body.email,
      phone: body.phone,
      password: body.password,
      displayName: body.displayName,
      age: body.age,
      gender: body.gender,
      bio: body.bio,
      parentalConsent: body.parentalConsent,
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const result = await authService.login({
      email: body.email,
      phone: body.phone,
      password: body.password,
      twoFactorCode: body.twoFactorCode,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const socialLogin = async (req: Request, res: Response) => {
  try {
    const body = socialLoginSchema.parse(req.body);

    const result = await authService.socialLogin(body.provider, body.token);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const body = verifyEmailSchema.parse(req.body);

    const result = await authService.verifyEmail(body);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyPhone = async (req: Request, res: Response) => {
  try {
    const body = verifyPhoneSchema.parse(req.body);

    const result = await authService.verifyPhone(body);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (type === 'email' && user.email) {
      await authService.sendVerificationCode(user.email, 'email');
    } else if (type === 'phone' && user.phone) {
      await authService.sendVerificationCode(user.phone, 'phone');
    } else {
      return res.status(400).json({ error: 'Invalid verification type or missing contact info' });
    }

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.getProfile(req.userId!);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const body = updateProfileSchema.parse(req.body);

    const result = await authService.updateProfile(req.userId!, body);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePrivacySettings = async (req: AuthRequest, res: Response) => {
  try {
    const body = privacySettingsSchema.parse(req.body);

    const result = await authService.updatePrivacySettings(req.userId!, body);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const body = changePasswordSchema.parse(req.body);

    const result = await authService.changePassword(req.userId!, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setupTwoFactor = async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.setupTwoFactor(req.userId!);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const enableTwoFactor = async (req: AuthRequest, res: Response) => {
  try {
    const body = twoFactorSetupSchema.parse(req.body);

    const result = await authService.enableTwoFactor(req.userId!, body.token);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const disableTwoFactor = async (req: AuthRequest, res: Response) => {
  try {
    const body = twoFactorSetupSchema.parse(req.body);

    const result = await authService.disableTwoFactor(req.userId!, body.token);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const body = deleteAccountSchema.parse(req.body);

    const result = await authService.deleteAccount(req.userId!, body.password);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitParentalConsent = async (req: Request, res: Response) => {
  try {
    const body = parentalConsentSchema.parse(req.body);
    const { childUserId } = req.params;

    await prisma.user.update({
      where: { id: childUserId },
      data: {
        parentalConsent: true,
        parentalConsentDate: new Date(),
        parentEmail: body.parentEmail,
      },
    });

    res.json({ message: 'Parental consent recorded' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
