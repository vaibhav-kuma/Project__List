import Redis from "ioredis";
import { getEnv } from "./env.js";

const env = getEnv();

// Initialize Redis with optimized connection pooling
export const redisCache = new Redis(env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true, // Only connect when requested
});

redisCache.on("error", (err) => console.error("Redis Cache Error:", err));

export async function getCached<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 60 * 5): Promise<T> {
  if (!env.REDIS_URL && process.env.NODE_ENV !== "production") {
    // Graceful fallback if Redis isn't strictly running locally during development
    return fetchFn();
  }

  try {
    const cached = await redisCache.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch (err) {
    // If Redis fails, gracefully fall back to DB source
    console.warn("Redis get failed:", err);
  }

  const data = await fetchFn();

  try {
    if (data !== undefined && data !== null) {
      await redisCache.setex(key, ttlSeconds, JSON.stringify(data));
    }
  } catch (err) {
    console.warn("Redis setex failed:", err);
  }

  return data;
}

export async function invalidateCache(key: string) {
  try {
    await redisCache.del(key);
  } catch (err) {
    console.warn("Redis del failed:", err);
  }
}
