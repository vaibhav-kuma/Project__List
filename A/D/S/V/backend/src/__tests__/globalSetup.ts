import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/ninor_test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.FRONTEND_URL = 'http://localhost:3000';

  try {
    await prisma.$connect();
    console.log('[Test Setup] Database connected');
  } catch (error: any) {
    console.warn('[Test Setup] Database unavailable, running with mocks:', error.message);
  }
}
