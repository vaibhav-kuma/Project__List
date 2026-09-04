import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis';

interface CacheOptions {
  ttl?: number;
  key?: (req: Request) => string;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 300 } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const cacheKey = options.key
      ? options.key(req)
      : `cache:${req.originalUrl}`;

    try {
      const cached = await cacheGet<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        if (res.statusCode === 200) {
          cacheSet(cacheKey, body, ttl).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch {
      next();
    }
  };
}

export function invalidateCache(pattern: string) {
  return cacheDel(pattern);
}
