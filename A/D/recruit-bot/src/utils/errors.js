const logger = require('../utils/logger');

// Custom error types
class RecruitBotError extends Error {
  constructor(type, message, context = {}) {
    super(message);
    this.name = 'RecruitBotError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class NavigationError extends RecruitBotError {
  constructor(message, context = {}) {
    super('NAVIGATION', message, context);
    this.name = 'NavigationError';
  }
}

class ExtractionError extends RecruitBotError {
  constructor(message, context = {}) {
    super('EXTRACTION', message, context);
    this.name = 'ExtractionError';
  }
}

class AuthenticationError extends RecruitBotError {
  constructor(message, context = {}) {
    super('AUTH', message, context);
    this.name = 'AuthenticationError';
  }
}

class RateLimitError extends RecruitBotError {
  constructor(message, context = {}) {
    super('RATE_LIMIT', message, context);
    this.name = 'RateLimitError';
  }
}

class SessionError extends RecruitBotError {
  constructor(message, context = {}) {
    super('SESSION', message, context);
    this.name = 'SessionError';
  }
}

// Error handler utility
class ErrorHandler {
  static classify(error) {
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('navigation') || msg.includes('navigate') || msg.includes('timeout')) {
      return 'NAVIGATION';
    }
    if (msg.includes('extract') || msg.includes('selector') || msg.includes('not found')) {
      return 'EXTRACTION';
    }
    if (msg.includes('auth') || msg.includes('login') || msg.includes('401') || msg.includes('unauthorized')) {
      return 'AUTH';
    }
    if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
      return 'RATE_LIMIT';
    }
    if (msg.includes('session') || msg.includes('expired')) {
      return 'SESSION';
    }

    return 'UNKNOWN';
  }

  static isRetryable(error) {
    const type = error.type || this.classify(error);
    return ['NAVIGATION', 'EXTRACTION', 'RATE_LIMIT', 'SESSION'].includes(type);
  }

  static getRetryDelay(attempt, baseDelay = 1000) {
    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    return baseDelay * Math.pow(2, attempt - 1);
  }

  static log(error, context = {}) {
    const type = error.type || this.classify(error);
    const level = type === 'RATE_LIMIT' ? 'warn' : 'error';

    logger[level](`${type} error`, {
      message: error.message,
      type,
      context: { ...error.context, ...context },
      stack: error.stack,
    });
  }
}

module.exports = {
  RecruitBotError,
  NavigationError,
  ExtractionError,
  AuthenticationError,
  RateLimitError,
  SessionError,
  ErrorHandler,
};
