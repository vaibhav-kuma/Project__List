const logger = require('./logger');

/**
 * Custom error classes
 */
class DealScoutError extends Error {
  constructor(message, type, statusCode = 500, details = {}) {
    super(message);
    this.name = 'DealScoutError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = Date.now();
  }
}

class ValidationError extends DealScoutError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

class RateLimitError extends DealScoutError {
  constructor(message, details = {}) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends DealScoutError {
  constructor(message, details = {}) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Circuit breaker for handling service failures
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    
    this.onStateChange = options.onStateChange || (() => {});
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.onStateChange('HALF_OPEN');
        logger.info('Circuit breaker moved to HALF_OPEN state');
      } else {
        throw new ServiceUnavailableError('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'CLOSED';
        this.successCount = 0;
        this.onStateChange('CLOSED');
        logger.info('Circuit breaker moved to CLOSED state');
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successCount = 0;
      this.onStateChange('OPEN');
      logger.warn('Circuit breaker moved to OPEN state from HALF_OPEN');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.onStateChange('OPEN');
      logger.warn(`Circuit breaker moved to OPEN state after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.onStateChange('CLOSED');
    logger.info('Circuit breaker reset to CLOSED state');
  }
}

/**
 * Error handler with retry logic and recovery
 */
class ErrorHandler {
  constructor() {
    this.circuitBreakers = new Map();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    };
  }

  /**
   * Get or create circuit breaker for service
   */
  getCircuitBreaker(serviceName, options = {}) {
    if (!this.circuitBreakers.has(serviceName)) {
      const breaker = new CircuitBreaker({
        ...options,
        onStateChange: (state) => {
          logger.info(`Circuit breaker for ${serviceName} changed to ${state}`);
        }
      });
      this.circuitBreakers.set(serviceName, breaker);
    }
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Execute function with error handling and retries
   */
  async executeWithRetry(fn, options = {}) {
    const {
      serviceName = 'default',
      maxRetries = this.retryConfig.maxRetries,
      baseDelay = this.retryConfig.baseDelay,
      retryCondition = this.defaultRetryCondition
    } = options;

    const circuitBreaker = this.getCircuitBreaker(serviceName);
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await circuitBreaker.execute(fn);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !retryCondition(error)) {
          break;
        }

        const delay = Math.min(
          baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        );

        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await this.delay(delay);
      }
    }

    throw this.enhanceError(lastError, { attempts: maxRetries + 1, serviceName });
  }

  /**
   * Default retry condition
   */
  defaultRetryCondition(error) {
    // Retry on network errors, timeouts, and 5xx status codes
    return (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNABORTED' ||
      error.type === 'TIMEOUT' ||
      error.type === 'NETWORK' ||
      (error.statusCode >= 500 && error.statusCode < 600)
    );
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, context = {}) {
    if (error instanceof DealScoutError) {
      error.details = { ...error.details, ...context };
      return error;
    }

    // Convert generic errors to DealScoutError
    const errorType = this.classifyError(error);
    return new DealScoutError(
      error.message,
      errorType,
      error.statusCode || 500,
      { originalError: error, ...context }
    );
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 'NETWORK_ERROR';
    }
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (error.statusCode === 429) {
      return 'RATE_LIMIT_ERROR';
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return 'CLIENT_ERROR';
    }
    if (error.statusCode >= 500) {
      return 'SERVER_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Express error middleware
   */
  expressErrorHandler() {
    return (error, req, res, next) => {
      const enhancedError = this.enhanceError(error, {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      logger.error('Express error:', {
        error: enhancedError.message,
        type: enhancedError.type,
        statusCode: enhancedError.statusCode,
        stack: enhancedError.stack,
        details: enhancedError.details
      });

      // Don't expose internal errors in production
      const message = process.env.NODE_ENV === 'production' && enhancedError.statusCode >= 500
        ? 'Internal server error'
        : enhancedError.message;

      res.status(enhancedError.statusCode).json({
        success: false,
        error: message,
        type: enhancedError.type,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV !== 'production' && { details: enhancedError.details })
      });
    };
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection() {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
      });

      // In production, you might want to gracefully shutdown
      if (process.env.NODE_ENV === 'production') {
        logger.error('Shutting down due to unhandled promise rejection');
        process.exit(1);
      }
    });
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException() {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });

      // Always exit on uncaught exceptions
      logger.error('Shutting down due to uncaught exception');
      process.exit(1);
    });
  }

  /**
   * Get error statistics
   */
  getStats() {
    const stats = {
      circuitBreakers: {}
    };

    for (const [serviceName, breaker] of this.circuitBreakers) {
      stats.circuitBreakers[serviceName] = breaker.getState();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance and classes
const errorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  CircuitBreaker,
  DealScoutError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  errorHandler
};