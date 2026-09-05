const { sleep } = require('./helpers');
const { ErrorHandler } = require('./errors');
const logger = require('./logger');
const metrics = require('./metrics');

async function withRetryAndRecovery(
  fn,
  {
    retries = 3,
    baseDelay = 1000,
    label = 'operation',
    onRetry = null,
    onRecovery = null,
  } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        metrics.recordRetry(true);
        if (onRecovery) await onRecovery(attempt);
      }
      return result;
    } catch (err) {
      lastError = err;
      ErrorHandler.log(err, { attempt, label });
      metrics.recordError(err.type || ErrorHandler.classify(err));

      if (attempt === retries) {
        metrics.recordRetry(false);
        break;
      }

      if (!ErrorHandler.isRetryable(err)) {
        throw err;
      }

      const delay = ErrorHandler.getRetryDelay(attempt, baseDelay);
      const jitter = Math.random() * 0.1 * delay; // 10% jitter
      const totalDelay = delay + jitter;

      logger.warn(`${label} failed (attempt ${attempt}/${retries}), retrying in ${totalDelay.toFixed(0)}ms`, {
        error: err.message,
        type: err.type,
      });

      if (onRetry) await onRetry(attempt, totalDelay);
      await sleep(totalDelay);
    }
  }

  throw lastError;
}

// Retry with session recovery
async function withSessionRecovery(
  fn,
  sessionManager,
  {
    retries = 3,
    baseDelay = 1000,
    label = 'operation',
  } = {}
) {
  return withRetryAndRecovery(
    fn,
    {
      retries,
      baseDelay,
      label,
      onRecovery: async (attempt) => {
        logger.info(`Recovered from error on attempt ${attempt}`, { label });
      },
    }
  );
}

module.exports = { withRetryAndRecovery, withSessionRecovery };
