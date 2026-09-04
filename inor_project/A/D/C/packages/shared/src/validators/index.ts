import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const videoCreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
  allowComments: z.boolean().optional(),
  ageRestricted: z.boolean().optional(),
  language: z.string().optional(),
});

export const videoUpdateSchema = videoCreateSchema.partial();

export const commentCreateSchema = z.object({
  content: z.string().min(1).max(10000),
  parentId: z.string().optional(),
});

export const playlistCreateSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(5000).optional(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
});

export const playlistUpdateSchema = playlistCreateSchema.partial();

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  type: z.enum(['video', 'channel', 'playlist', 'all']).optional(),
  sort: z.enum(['relevance', 'date', 'views', 'rating']).optional(),
  duration: z.enum(['short', 'medium', 'long', 'all']).optional(),
  uploadDate: z.enum(['hour', 'today', 'week', 'month', 'year', 'all']).optional(),
  features: z.array(z.string()).optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VideoCreateInput = z.infer<typeof videoCreateSchema>;
export type VideoUpdateInput = z.infer<typeof videoUpdateSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
