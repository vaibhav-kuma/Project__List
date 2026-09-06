import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string().email('Invalid email address').max(255);

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format)')
  .max(20);

export const ageSchema = z
  .number()
  .int('Age must be a whole number')
  .min(13, 'You must be at least 13 years old')
  .max(120, 'Invalid age');

export const displayNameSchema = z
  .string()
  .min(2, 'Display name must be at least 2 characters')
  .max(50, 'Display name must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_\s-]+$/, 'Display name can only contain letters, numbers, spaces, underscores, and hyphens');

export const bioSchema = z.string().max(500, 'Bio must be less than 500 characters').optional();

export const genderSchema = z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']);

export const registerSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema,
  displayName: displayNameSchema,
  age: ageSchema,
  gender: genderSchema,
  bio: bioSchema,
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms and privacy policy'),
  acceptPrivacyPolicy: z.boolean().refine((val) => val === true, 'You must accept the privacy policy'),
  parentalConsent: z.boolean().optional(),
}).refine((data) => {
  if (!data.email && !data.phone) {
    return false;
  }
  return true;
}, { message: 'Either email or phone is required' })
.refine((data) => {
  if (data.age < 18 && !data.parentalConsent) {
    return false;
  }
  return true;
}, { message: 'Users under 18 require parental consent' });

export const loginSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().length(6).optional(),
}).refine((data) => {
  if (!data.email && !data.phone) {
    return false;
  }
  return true;
}, { message: 'Either email or phone is required' });

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: bioSchema,
  gender: genderSchema.optional(),
  avatarUrl: z.string().url('Invalid URL').max(500).optional(),
});

export const privacySettingsSchema = z.object({
  showAge: z.boolean().optional(),
  showGender: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  allowMessagesFrom: z.enum(['everyone', 'friends', 'none']).optional(),
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  matchNotifications: z.boolean().optional(),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const verifyPhoneSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const twoFactorSetupSchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmDelete: z.boolean().refine((val) => val === true, 'You must confirm account deletion'),
});

export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  token: z.string().min(1, 'Token is required'),
});

export const parentalConsentSchema = z.object({
  parentEmail: emailSchema,
  parentName: z.string().min(2).max(100),
  relationship: z.string().min(2).max(50),
  consent: z.boolean().refine((val) => val === true, 'Parental consent is required'),
});
