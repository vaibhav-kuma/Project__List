import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalTeardown(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {}
  console.log('[Test Teardown] Database disconnected');
}
