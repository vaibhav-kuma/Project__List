jest.mock('../src/api/tinyfish');
jest.mock('../src/utils/helpers', () => ({
  sleep: jest.fn().mockResolvedValue(),
  withRetry: jest.fn().mockImplementation(async (fn) => fn()),
}));

const TinyFishClient = require('../src/api/tinyfish');
const LinkedInAuth = require('../src/agents/linkedinAuth');
const LinkedInSearch = require('../src/agents/linkedinSearch');
const LinkedInAgent = require('../src/agents/linkedinAgent');

// ─── shared mock client ───────────────────────────────────────────────────────
function makeMockClient(overrides = {}) {
  return {
    createSession: jest.fn().mockResolvedValue({ sessionId: 'sess_test' }),
    navigate: jest.fn().mockResolvedValue({ status: 'ok' }),
    execute: jest.fn().mockResolvedValue({}),
    extract: jest.fn().mockResolvedValue({}),
    getCookies: jest.fn().mockResolvedValue([{ name: 'li_at', value: 'token' }]),
    setCookies: jest.fn().mockResolvedValue({}),
    getSessionViewerUrl: jest.fn().mockResolvedValue('https://viewer.tinyfish.io/sess_test'),
    closeSession: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// ─── LinkedInAuth ─────────────────────────────────────────────────────────────
describe('LinkedInAuth', () => {
  let client, auth;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LINKEDIN_EMAIL = 'test@example.com';
    process.env.LINKEDIN_PASSWORD = 'password123';
    client = makeMockClient();
    auth = new LinkedInAuth(client);
  });

  test('isLoggedIn returns true when nav bar exists', async () => {
    client.extract.mockResolvedValue({ navBar: true });
    expect(await auth.isLoggedIn('sess_test')).toBe(true);
  });

  test('isLoggedIn returns false when nav bar missing', async () => {
    client.extract.mockResolvedValue({ navBar: false });
    expect(await auth.isLoggedIn('sess_test')).toBe(false);
  });

  test('login fills credentials and persists cookies on success', async () => {
    // After submit: no captcha, no 2FA, no error, logged in
    client.extract
      .mockResolvedValueOnce({ hasCaptcha: false, has2FA: false, hasError: null, currentUrl: 'https://www.linkedin.com/feed/' })
      .mockResolvedValue({ navBar: true });

    await auth.login('sess_test');

    expect(client.execute).toHaveBeenCalled();
    expect(client.getCookies).toHaveBeenCalledWith('sess_test');
  });

  test('login throws when credentials are missing', async () => {
    delete process.env.LINKEDIN_EMAIL;
    await expect(auth.login('sess_test')).rejects.toThrow('LINKEDIN_EMAIL');
  });

  test('login throws when error message is present on page', async () => {
    client.extract.mockResolvedValue({
      hasCaptcha: false,
      has2FA: false,
      hasError: 'Incorrect password',
      currentUrl: 'https://www.linkedin.com/login',
    });
    await expect(auth.login('sess_test')).rejects.toThrow('Incorrect password');
  });
});

// ─── LinkedInSearch ───────────────────────────────────────────────────────────
describe('LinkedInSearch', () => {
  let client, search;

  const mockCandidates = [
    { name: 'Alice Smith', headline: 'Senior Engineer', location: 'NYC', profileUrl: '/in/alice', imageUrl: 'img1.jpg' },
    { name: 'Bob Jones', headline: 'Staff Engineer', location: 'SF', profileUrl: '/in/bob', imageUrl: 'img2.jpg' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeMockClient();
    search = new LinkedInSearch(client);
  });

  test('extractPage returns normalised candidates with absolute URLs', async () => {
    client.extract.mockResolvedValue({ candidates: mockCandidates });
    const results = await search.extractPage('sess_test');
    expect(results).toHaveLength(2);
    expect(results[0].profileUrl).toBe('https://www.linkedin.com/in/alice');
    expect(results[0].source).toBe('linkedin');
  });

  test('extractPage filters out candidates without name or profileUrl', async () => {
    client.extract.mockResolvedValue({
      candidates: [...mockCandidates, { name: '', profileUrl: '' }],
    });
    const results = await search.extractPage('sess_test');
    expect(results).toHaveLength(2);
  });

  test('hasNextPage returns true when next button exists and is not disabled', async () => {
    client.extract.mockResolvedValue({ nextBtn: true, nextDisabled: null });
    expect(await search.hasNextPage('sess_test')).toBe(true);
  });

  test('hasNextPage returns false when next button is disabled', async () => {
    client.extract.mockResolvedValue({ nextBtn: true, nextDisabled: 'true' });
    expect(await search.hasNextPage('sess_test')).toBe(false);
  });

  test('scrapePages stops early when no next page', async () => {
    client.extract
      .mockResolvedValueOnce({ candidates: mockCandidates }) // page 1 extract
      .mockResolvedValueOnce({ nextBtn: false });             // hasNextPage

    const results = await search.scrapePages('sess_test', 5);
    expect(results).toHaveLength(2);
  });

  test('scrapePages collects candidates across multiple pages', async () => {
    client.extract
      .mockResolvedValueOnce({ candidates: mockCandidates })       // page 1
      .mockResolvedValueOnce({ nextBtn: true, nextDisabled: null }) // hasNextPage
      .mockResolvedValueOnce({ candidates: mockCandidates })       // page 2
      .mockResolvedValueOnce({ nextBtn: false });                   // hasNextPage

    const results = await search.scrapePages('sess_test', 5);
    expect(results).toHaveLength(4);
  });

  test('enrichProfile merges profile data onto candidate', async () => {
    client.extract.mockResolvedValue({
      about: 'Experienced engineer',
      experience: [{ title: 'SWE', company: 'Acme', duration: '2y' }],
      education: [{ school: 'MIT', degree: 'BS CS' }],
      skills: [{ name: 'JavaScript' }, { name: 'Node.js' }],
    });

    const result = await search.enrichProfile('sess_test', mockCandidates[0]);
    expect(result.about).toBe('Experienced engineer');
    expect(result.skills).toEqual(['JavaScript', 'Node.js']);
    expect(result.enrichedAt).toBeDefined();
  });
});

// ─── LinkedInAgent (integration) ─────────────────────────────────────────────
describe('LinkedInAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LINKEDIN_EMAIL = 'test@example.com';
    process.env.LINKEDIN_PASSWORD = 'password123';
    process.env.TINYFISH_API_KEY = 'test-key';
  });

  function buildAgent() {
    const agent = new LinkedInAgent();

    // Replace internals with mocks
    agent.client = makeMockClient();
    agent.auth = {
      ensureAuthenticated: jest.fn().mockResolvedValue(),
    };

    const mockCandidates = Array.from({ length: 12 }, (_, i) => ({
      name: `Candidate ${i}`,
      profileUrl: `https://www.linkedin.com/in/candidate-${i}`,
      headline: 'Engineer',
      location: 'NYC',
      source: 'linkedin',
    }));

    agent.search = {
      applyFilters: jest.fn().mockResolvedValue(),
      scrapePages: jest.fn().mockResolvedValue(mockCandidates),
      enrichProfile: jest.fn().mockImplementation(async (sid, c) => ({
        ...c,
        about: 'About text',
        skills: ['JavaScript'],
        enrichedAt: new Date().toISOString(),
      })),
    };

    return { agent, mockCandidates };
  }

  test('run returns candidates with viewerUrl and durationSec', async () => {
    const { agent } = buildAgent();
    const result = await agent.run({ title: 'Engineer', location: 'NYC', enrichTopN: 3 });

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.viewerUrl).toBe('https://viewer.tinyfish.io/sess_test');
    expect(typeof result.durationSec).toBe('number');
  });

  test('run deduplicates candidates by profileUrl', async () => {
    const { agent } = buildAgent();
    const dupe = {
      name: 'Candidate 0',
      profileUrl: 'https://www.linkedin.com/in/candidate-0',
      headline: 'Engineer',
      location: 'NYC',
      source: 'linkedin',
    };
    agent.search.scrapePages.mockResolvedValue([dupe, dupe, dupe]);
    agent.search.enrichProfile.mockResolvedValue({ ...dupe, skills: [] });

    const result = await agent.run({ title: 'Engineer', location: 'NYC', enrichTopN: 5 });
    const urls = result.candidates.map((c) => c.profileUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test('run closes session even when an error is thrown', async () => {
    const { agent } = buildAgent();
    agent.search.applyFilters.mockRejectedValue(new Error('Navigation failed'));

    await expect(agent.run({ title: 'Engineer', location: 'NYC' })).rejects.toThrow('Navigation failed');
    expect(agent.client.closeSession).toHaveBeenCalled();
  });

  test('_withRateLimitRecovery retries after rate-limit error', async () => {
    const { agent } = buildAgent();
    agent.sessionId = 'sess_test';

    let calls = 0;
    const fn = jest.fn().mockImplementation(async () => {
      if (++calls === 1) throw new Error('429 rate limited');
      return 'ok';
    });

    const result = await agent._withRateLimitRecovery(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
