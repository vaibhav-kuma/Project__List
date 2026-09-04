import { createClient, RedisClientType } from 'redis';

interface CacheOptions {
  ttl?: number;
  prefix?: string;
  keyTransform?: (key: string) => string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: number;
  tags?: string[];
}

export class RedisCache {
  private client: RedisClientType;
  private defaultTTL: number;
  private prefix: string;
  private connected: boolean = false;
  private connecting: boolean = false;
  private connectPromise: Promise<void> | null = null;

  constructor(options: { url?: string; defaultTTL?: number; prefix?: string } = {}) {
    this.defaultTTL = options.defaultTTL || 300;
    this.prefix = options.prefix || 'cache:';

    this.client = createClient({
      url: options.url || process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
        connectTimeout: 10000,
      },
    });

    this.client.on('error', (err) => {
      console.error('[RedisCache] Error:', err.message);
      this.connected = false;
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.connecting = false;
    });

    this.client.on('end', () => {
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connecting && this.connectPromise) return this.connectPromise;

    this.connecting = true;
    this.connectPromise = this.client.connect().then(() => {
      this.connected = true;
      this.connecting = false;
    }).catch((err) => {
      this.connecting = false;
      this.connectPromise = null;
      throw err;
    });

    return this.connectPromise;
  }

  async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect().catch(() => {});
    }
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return entry.expiresAt > 0 && Date.now() > entry.expiresAt;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnected();
    if (!this.connected) return null;

    try {
      const raw = await this.client.get(this.buildKey(key));
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (this.isExpired(entry)) {
        this.client.del(this.buildKey(key)).catch(() => {});
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.ensureConnected();
    if (!this.connected) return;

    const entry: CacheEntry<T> = {
      data,
      expiresAt: ttl ? Date.now() + ttl * 1000 : 0,
      cachedAt: Date.now(),
    };

    try {
      const cacheKey = this.buildKey(key);
      const serialized = JSON.stringify(entry);

      if (ttl) {
        await this.client.setEx(cacheKey, ttl, serialized);
      } else if (this.defaultTTL > 0) {
        await this.client.setEx(cacheKey, this.defaultTTL, serialized);
      } else {
        await this.client.set(cacheKey, serialized);
      }
    } catch {}
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    if (!this.connected) return;

    try {
      await this.client.del(this.buildKey(key));
    } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    await this.ensureConnected();
    if (!this.connected) return;

    try {
      const keys = await this.client.keys(this.buildKey(pattern));
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {}
  }

  async remember<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  async rememberMany<T>(
    keys: string[],
    fetchFn: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttl?: number
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missingKeys: string[] = [];

    for (const key of keys) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        results.set(key, cached);
      } else {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      const fetched = await fetchFn(missingKeys);
      for (const [key, data] of fetched) {
        results.set(key, data);
        this.set(key, data, ttl);
      }
    }

    return results;
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureConnected();
    if (!this.connected) return false;

    try {
      const result = await this.client.exists(this.buildKey(key));
      return result === 1;
    } catch {
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected();
    if (!this.connected) return -2;

    try {
      return await this.client.ttl(this.buildKey(key));
    } catch {
      return -2;
    }
  }

  async flush(): Promise<void> {
    await this.ensureConnected();
    if (!this.connected) return;

    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {}
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<{ data: T; cached: boolean }> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }

    const data = await fetchFn();
    await this.set(key, data, ttl);
    return { data, cached: false };
  }

  async pipeline<T>(
    operations: Array<{ type: 'get' | 'set' | 'del'; key: string; data?: T; ttl?: number }>
  ): Promise<Array<T | null | void>> {
    await this.ensureConnected();
    if (!this.connected) return [];

    try {
      const pipeline = this.client.multi();
      const results: Array<T | null | void> = [];

      for (const op of operations) {
        const cacheKey = this.buildKey(op.key);
        switch (op.type) {
          case 'get':
            pipeline.get(cacheKey);
            break;
          case 'set':
            if (op.ttl) {
              pipeline.setEx(cacheKey, op.ttl, JSON.stringify({ data: op.data, expiresAt: Date.now() + op.ttl * 1000, cachedAt: Date.now() }));
            } else if (this.defaultTTL > 0) {
              pipeline.setEx(cacheKey, this.defaultTTL, JSON.stringify({ data: op.data, expiresAt: Date.now() + this.defaultTTL * 1000, cachedAt: Date.now() }));
            } else {
              pipeline.set(cacheKey, JSON.stringify({ data: op.data, expiresAt: 0, cachedAt: Date.now() }));
            }
            break;
          case 'del':
            pipeline.del(cacheKey);
            break;
        }
      }

      const rawResults = await pipeline.exec();
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const raw = rawResults?.[i];
        if (op.type === 'get' && raw) {
          try {
            const entry = JSON.parse(raw as string);
            if (!this.isExpired(entry)) {
              results.push(entry.data as T);
            } else {
              results.push(null);
            }
          } catch {
            results.push(null);
          }
        } else {
          results.push(undefined);
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit().catch(() => {});
      this.connected = false;
    }
  }
}

let cacheInstance: RedisCache | null = null;

export function getCache(options?: { url?: string; defaultTTL?: number; prefix?: string }): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(options);
  }
  return cacheInstance;
}

export async function initializeCache(): Promise<RedisCache> {
  const cache = getCache();
  await cache.connect();
  return cache;
}
