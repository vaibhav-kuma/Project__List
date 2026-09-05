const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn, { retries = 3, baseDelay = 1000, label = 'operation' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const delay = baseDelay * 2 ** (attempt - 1);
      require('./logger').warn(`${label} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms`, {
        error: err.message,
      });
      await sleep(delay);
    }
  }
  throw lastError;
}

module.exports = { sleep, withRetry };
