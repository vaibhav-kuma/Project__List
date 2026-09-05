jest.mock('axios');
const axios = require('axios');

// Mock axios.create to return a mock instance
const mockHttp = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
};
axios.create.mockReturnValue(mockHttp);

process.env.TINYFISH_API_KEY = 'test-key';
const TinyFishClient = require('../src/api/tinyfish');

describe('TinyFishClient', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply interceptor mock after clearAllMocks
    mockHttp.interceptors = { response: { use: jest.fn() } };
    client = new TinyFishClient();
    // Bypass interceptor — use raw mock responses
    mockHttp.interceptors.response.use.mockImplementation(() => {});
  });

  test('createSession calls POST /sessions and returns sessionId', async () => {
    mockHttp.post.mockResolvedValue({ data: { sessionId: 'sess_123' } });
    const result = await client.createSession();
    expect(mockHttp.post).toHaveBeenCalledWith('/sessions', expect.any(Object));
    expect(result.sessionId).toBe('sess_123');
  });

  test('navigate calls POST /sessions/:id/navigate', async () => {
    mockHttp.post.mockResolvedValue({ data: { status: 'ok' } });
    await client.navigate('sess_123', 'https://example.com');
    expect(mockHttp.post).toHaveBeenCalledWith(
      '/sessions/sess_123/navigate',
      expect.objectContaining({ url: 'https://example.com' })
    );
  });

  test('execute normalizes single action to array', async () => {
    mockHttp.post.mockResolvedValue({ data: {} });
    await client.execute('sess_123', { type: 'click', selector: '#btn' });
    const payload = mockHttp.post.mock.calls[0][1];
    expect(Array.isArray(payload.actions)).toBe(true);
    expect(payload.actions).toHaveLength(1);
  });

  test('closeSession calls DELETE /sessions/:id', async () => {
    mockHttp.delete.mockResolvedValue({ data: {} });
    await client.closeSession('sess_123');
    expect(mockHttp.delete).toHaveBeenCalledWith('/sessions/sess_123');
  });

  test('throws if TINYFISH_API_KEY is missing', () => {
    const key = process.env.TINYFISH_API_KEY;
    delete process.env.TINYFISH_API_KEY;
    expect(() => new TinyFishClient()).toThrow('TINYFISH_API_KEY is required');
    process.env.TINYFISH_API_KEY = key;
  });
});
