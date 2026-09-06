import { getBaseUrl } from './setup';

const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPass123!',
  displayName: 'TestUser',
  age: 25,
  gender: 'male',
};

let token: string;
let userId: string;

describe('Auth Flow Integration', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe(TEST_USER.email);
      token = data.token;
      userId = data.user.id;
    });

    it('should reject duplicate email', async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
      });
      expect(res.status).toBe(409);
    });

    it('should reject invalid data', async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad', password: 'short', displayName: '', age: 10, gender: 'x' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.token).toBeDefined();
      token = data.token;
    });

    it('should reject wrong password', async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_USER.email, password: 'wrong' }),
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost@test.com', password: 'TestPass123!' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user with valid token', async () => {
      const res = await fetch(`${getBaseUrl()}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(userId);
    });

    it('should reject missing token', async () => {
      const res = await fetch(`${getBaseUrl()}/api/users/me`);
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await fetch(`${getBaseUrl()}/api/users/me`, {
        headers: { Authorization: 'Bearer bad-token' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/me/preferences', () => {
    it('should update user preferences', async () => {
      const res = await fetch(`${getBaseUrl()}/api/users/me/preferences`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageRangeMin: 18, ageRangeMax: 35, preferredGenders: ['female'] }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate-limit auth endpoints', async () => {
      const requests = Array(25).fill(null).map(() =>
        fetch(`${getBaseUrl()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'TestPass123!' }),
        })
      );
      const results = await Promise.all(requests);
      const tooMany = results.filter((r) => r.status === 429);
      expect(tooMany.length).toBeGreaterThan(0);
    });
  });
});
