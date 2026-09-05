import { RedisCache } from '../services/cacheService';

let mockStore: Map<string, string> = new Map();

jest.mock('redis', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn((key: string) => Promise.resolve(mockStore.get(key) || null)),
    set: jest.fn((key: string, value: string) => { mockStore.set(key, value); return Promise.resolve('OK'); }),
    setEx: jest.fn((key: string, _ttl: number, value: string) => { mockStore.set(key, value); return Promise.resolve('OK'); }),
    del: jest.fn((key: string) => { mockStore.delete(key); return Promise.resolve(1); }),
    exists: jest.fn((key: string) => Promise.resolve(mockStore.has(key) ? 1 : 0)),
    keys: jest.fn((pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Promise.resolve(Array.from(mockStore.keys()).filter(k => regex.test(k)));
    }),
    multi: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    isOpen: true,
  };
  return {
    createClient: jest.fn(() => mockClient),
  };
});

describe('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(() => {
    mockStore = new Map();
    cache = new RedisCache({ url: 'redis://localhost:6379', defaultTTL: 60, prefix: 'test:' });
  });

  afterEach(async () => {
    await cache.close();
  });

  describe('get and set', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { hello: 'world' });
      const result = await cache.get('key1');
      expect(result).toEqual({ hello: 'world' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should store primitive values', async () => {
      await cache.set('str', 'hello');
      await cache.set('num', 42);
      await cache.set('bool', true);

      expect(await cache.get('str')).toBe('hello');
      expect(await cache.get('num')).toBe(42);
      expect(await cache.get('bool')).toBe(true);
    });
  });

  describe('remember', () => {
    it('should return cached value when available', async () => {
      await cache.set('cached', 'from-cache');
      const fetchFn = jest.fn().mockResolvedValue('from-db');

      const result = await cache.remember('cached', fetchFn);
      expect(result).toBe('from-cache');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache when missing', async () => {
      const fetchFn = jest.fn().mockResolvedValue('fresh-data');
      const result = await cache.remember('fresh', fetchFn);
      expect(result).toBe('fresh-data');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('DB error'));
      await expect(cache.remember('error-key', fetchFn)).rejects.toThrow('DB error');
    });
  });

  describe('exists and del', () => {
    it('should report key existence', async () => {
      await cache.set('existing', 'value');
      expect(await cache.exists('existing')).toBe(true);
      expect(await cache.exists('missing')).toBe(false);
    });

    it('should delete keys', async () => {
      await cache.set('to-delete', 'value');
      await cache.del('to-delete');
      const result = await cache.get('to-delete');
      expect(result).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached flag when cache hit', async () => {
      await cache.set('hit', 'data');
      const result = await cache.getOrSet('hit', jest.fn());
      expect(result.data).toBe('data');
      expect(result.cached).toBe(true);
    });

    it('should return not-cached flag on miss', async () => {
      const result = await cache.getOrSet('miss', () => Promise.resolve('fresh'));
      expect(result.data).toBe('fresh');
      expect(result.cached).toBe(false);
    });
  });
});
