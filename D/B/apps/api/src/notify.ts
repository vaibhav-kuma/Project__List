import { prisma } from "./prisma.js";

export async function notifyUserEmailLike(userId: string, type: string, payload: any) {
  // Dev-mode: store as in-app notification + log.
  await prisma.notification.create({
    data: {
      userId,
      type,
      payload: payload ?? null
    }
  });

  // eslint-disable-next-line no-console
  console.log("[notify]", { userId, type, payload });
}

