import { v4 as uuid } from 'uuid';

export function createMockUser(overrides: Partial<any> = {}): any {
  const id = uuid();
  return {
    id,
    email: `test-${id.slice(0, 8)}@example.com`,
    phone: null,
    displayName: `TestUser_${id.slice(0, 6)}`,
    age: 25,
    gender: 'male',
    avatarUrl: null,
    bio: 'Test bio',
    isVerified: false,
    status: 'offline',
    role: 'user',
    isPremium: false,
    isBanned: false,
    isMinor: false,
    restrictedMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    ...overrides,
  };
}

export function createMockSession(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    user1Id: uuid(),
    user2Id: uuid(),
    status: 'active',
    startedAt: new Date(),
    durationSeconds: 0,
    maxDurationSeconds: 15,
    extended: false,
    extendCount: 0,
    videoQuality: 'high',
    wasReported: false,
    flaggedContent: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockReport(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    reporterId: uuid(),
    reportedUserId: uuid(),
    reason: 'harassment',
    description: 'Inappropriate behavior during video chat',
    status: 'pending',
    severity: 3,
    priority: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockMatch(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    userId: uuid(),
    matchedWith: uuid(),
    sessionId: uuid(),
    matchedAt: new Date(),
    waitTimeSeconds: 5,
    matchType: 'random',
    connected: true,
    durationSeconds: 15,
    addedAsFriend: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockMoment(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    userId: uuid(),
    mediaUrl: 'https://cdn.example.com/moment.jpg',
    mediaType: 'image',
    caption: 'My moment',
    viewCount: 0,
    likeCount: 0,
    replyCount: 0,
    moderationStatus: 'pending',
    visibility: 'friends',
    isExpired: false,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockSubscription(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    userId: uuid(),
    plan: 'plus',
    status: 'active',
    provider: 'stripe',
    providerSubscriptionId: `sub_${uuid().replace(/-/g, '')}`,
    amount: 9.99,
    currency: 'USD',
    interval: 'month',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    autoRenew: true,
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockNotification(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    userId: uuid(),
    type: 'match',
    title: 'New Match!',
    message: 'You matched with someone',
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockPreferences(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    userId: uuid(),
    preferredGenders: ['female', 'non_binary'],
    ageRangeMin: 18,
    ageRangeMax: 45,
    languages: ['en'],
    countries: [],
    interestTags: ['music', 'travel'],
    pushNotifications: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockRequest(overrides: Partial<any> = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    get: (name: string) => overrides.headers?.[name],
    ...overrides,
  };
}

export function createMockResponse(overrides: Partial<any> = {}): any {
  const res: any = {};
  res.statusCode = 200;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(null);
  res.removeHeader = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return { ...res, ...overrides };
}

export function createMockNext(): jest.Mock {
  return jest.fn();
}

export function createMockSocket(overrides: Partial<any> = {}): any {
  return {
    id: uuid(),
    data: { userId: uuid() },
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    handshake: {
      headers: {},
      query: {},
      auth: { token: 'test-token' },
    },
    ...overrides,
  };
}

export function createMockRedis(overrides: Partial<any> = {}): any {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    keys: jest.fn().mockResolvedValue([]),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(300),
    zAdd: jest.fn().mockResolvedValue(1),
    zRem: jest.fn().mockResolvedValue(1),
    zRangeByScore: jest.fn().mockResolvedValue([]),
    zCard: jest.fn().mockResolvedValue(0),
    multi: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),
    flushDb: jest.fn().mockResolvedValue('OK'),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    isOpen: true,
    ...overrides,
  };
}
