const {
  NavigationError,
  ExtractionError,
  AuthenticationError,
  RateLimitError,
  SessionError,
  ErrorHandler,
} = require('../src/utils/errors');
const metrics = require('../src/utils/metrics');

describe('Error Types', () => {
  test('NavigationError has correct type', () => {
    const err = new NavigationError('Failed to navigate', { url: 'https://example.com' });
    expect(err.type).toBe('NAVIGATION');
    expect(err.message).toBe('Failed to navigate');
  });

  test('ExtractionError has correct type', () => {
    const err = new ExtractionError('Selector not found');
    expect(err.type).toBe('EXTRACTION');
  });

  test('AuthenticationError has correct type', () => {
    const err = new AuthenticationError('Login failed');
    expect(err.type).toBe('AUTH');
  });

  test('RateLimitError has correct type', () => {
    const err = new RateLimitError('429 Too Many Requests');
    expect(err.type).toBe('RATE_LIMIT');
  });

  test('SessionError has correct type', () => {
    const err = new SessionError('Session expired');
    expect(err.type).toBe('SESSION');
  });
});

describe('ErrorHandler', () => {
  test('classifies navigation errors', () => {
    expect(ErrorHandler.classify(new Error('Navigation timeout'))).toBe('NAVIGATION');
  });

  test('classifies extraction errors', () => {
    expect(ErrorHandler.classify(new Error('Selector not found'))).toBe('EXTRACTION');
  });

  test('classifies auth errors', () => {
    expect(ErrorHandler.classify(new Error('401 Unauthorized'))).toBe('AUTH');
  });

  test('classifies rate limit errors', () => {
    expect(ErrorHandler.classify(new Error('429 Too Many Requests'))).toBe('RATE_LIMIT');
  });

  test('isRetryable for retryable errors', () => {
    expect(ErrorHandler.isRetryable(new NavigationError('Timeout'))).toBe(true);
    expect(ErrorHandler.isRetryable(new RateLimitError('429'))).toBe(true);
  });

  test('exponential backoff calculation', () => {
    expect(ErrorHandler.getRetryDelay(1, 1000)).toBe(1000);
    expect(ErrorHandler.getRetryDelay(2, 1000)).toBe(2000);
    expect(ErrorHandler.getRetryDelay(3, 1000)).toBe(4000);
  });
});

describe('Metrics', () => {
  beforeEach(() => {
    metrics.reset();
  });

  test('records job start', () => {
    metrics.recordJobStart();
    expect(metrics.getStats().jobs.total).toBe(1);
  });

  test('records job completion', () => {
    metrics.recordJobStart();
    metrics.recordJobComplete(120);
    const stats = metrics.getStats();
    expect(stats.jobs.completed).toBe(1);
    expect(stats.jobs.avgDurationSec).toBe('120.0');
  });

  test('records job failure', () => {
    metrics.recordJobStart();
    metrics.recordJobFailed();
    expect(metrics.getStats().jobs.failed).toBe(1);
  });

  test('calculates success rate', () => {
    metrics.recordJobStart();
    metrics.recordJobStart();
    metrics.recordJobComplete(100);
    metrics.recordJobFailed();
    expect(metrics.getStats().jobs.successRate).toBe('50.0%');
  });

  test('records LinkedIn metrics', () => {
    metrics.recordLinkedInSession();
    metrics.recordLinkedInLogin(true);
    metrics.recordLinkedInSearch();
    metrics.recordCandidatesExtracted(50);
    metrics.recordProfileEnriched();

    const stats = metrics.getStats();
    expect(stats.linkedin.sessions).toBe(1);
    expect(stats.linkedin.logins).toBe(1);
    expect(stats.linkedin.searches).toBe(1);
    expect(stats.linkedin.candidatesExtracted).toBe(50);
    expect(stats.linkedin.profilesEnriched).toBe(1);
  });

  test('records errors by type', () => {
    metrics.recordError('NAVIGATION');
    metrics.recordError('EXTRACTION');
    metrics.recordError('RATE_LIMIT');

    const stats = metrics.getStats();
    expect(stats.errors.NAVIGATION).toBe(1);
    expect(stats.errors.EXTRACTION).toBe(1);
    expect(stats.errors.RATE_LIMIT).toBe(1);
  });

  test('records retries', () => {
    metrics.recordRetry(true);
    metrics.recordRetry(true);
    metrics.recordRetry(false);

    const stats = metrics.getStats();
    expect(stats.retries.total).toBe(3);
    expect(stats.retries.successful).toBe(2);
    expect(stats.retries.failed).toBe(1);
  });
});
