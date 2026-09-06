const axios = require('axios');
const logger = require('./logger');

/**
 * Custom error types for TinyFish operations
 */
class TinyFishError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'TinyFishError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Production-grade TinyFish API client with retry logic and error handling
 */
class TinyFishClient {
  constructor(apiKey, baseUrl = process.env.TINYFISH_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    this.sessions = new Map();
    this.retryDelays = [1000, 2000, 4000]; // Exponential backoff
  }

  /**
   * Execute method with retry logic and error handling
   */
  async executeWithRetry(method, ...args) {
    let lastError;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.retryDelays[attempt - 1]);
          logger.info(`Retrying ${method} - attempt ${attempt + 1}`);
        }
        
        return await this[`_${method}`](...args);
      } catch (error) {
        lastError = error;
        
        if (error.type === 'RATE_LIMIT') {
          await this.delay(5000 * (attempt + 1));
          continue;
        }
        
        if (error.type === 'SESSION_EXPIRED' && attempt < 2) {
          logger.warn('Session expired, will retry with new session');
          continue;
        }
        
        if (attempt === 2 || error.type === 'NETWORK') {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Create a new browser session
   */
  async createSession(options = {}) {
    return this.executeWithRetry('createSession', options);
  }

  async _createSession(options = {}) {
    try {
      const response = await this.client.post('/sessions', {
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options
      });
      
      const sessionId = response.data.sessionId;
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now()
      });
      
      logger.info(`Created session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      throw this.handleError(error, 'createSession');
    }
  }

  /**
   * Navigate to URL
   */
  async navigate(sessionId, url, options = {}) {
    return this.executeWithRetry('navigate', sessionId, url, options);
  }

  async _navigate(sessionId, url, options = {}) {
    try {
      await this.client.post(`/sessions/${sessionId}/navigate`, {
        url,
        waitUntil: 'networkidle0',
        timeout: 30000,
        ...options
      });
      
      this.updateSessionActivity(sessionId);
      logger.info(`Navigated to: ${url}`);
      
      // Human-like delay
      await this.delay(1000 + Math.random() * 1000);
    } catch (error) {
      throw this.handleError(error, 'navigate');
    }
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(sessionId, selector, options = {}) {
    return this.executeWithRetry('waitForElement', sessionId, selector, options);
  }

  async _waitForElement(sessionId, selector, options = {}) {
    try {
      const response = await this.client.post(`/sessions/${sessionId}/wait`, {
        selector,
        timeout: options.timeout || 10000,
        visible: options.visible !== false
      });
      
      this.updateSessionActivity(sessionId);
      return response.data.element;
    } catch (error) {
      throw this.handleError(error, 'waitForElement');
    }
  }

  /**
   * Click element with fallback selectors
   */
  async click(sessionId, selector, options = {}) {
    return this.executeWithRetry('click', sessionId, selector, options);
  }

  async _click(sessionId, selector, options = {}) {
    const selectors = Array.isArray(selector) ? selector : [selector];
    
    for (const sel of selectors) {
      try {
        await this.client.post(`/sessions/${sessionId}/click`, {
          selector: sel,
          timeout: 5000,
          ...options
        });
        
        this.updateSessionActivity(sessionId);
        logger.info(`Clicked: ${sel}`);
        
        // Human-like delay
        await this.delay(500 + Math.random() * 500);
        return;
      } catch (error) {
        if (selectors.indexOf(sel) === selectors.length - 1) {
          throw this.handleError(error, 'click');
        }
        logger.warn(`Selector failed, trying next: ${sel}`);
      }
    }
  }

  /**
   * Type text into element
   */
  async type(sessionId, selector, text, options = {}) {
    return this.executeWithRetry('type', sessionId, selector, text, options);
  }

  async _type(sessionId, selector, text, options = {}) {
    try {
      await this.client.post(`/sessions/${sessionId}/type`, {
        selector,
        text,
        delay: options.delay || 50,
        clear: options.clear !== false
      });
      
      this.updateSessionActivity(sessionId);
      logger.info(`Typed into: ${selector}`);
      
      // Human-like delay
      await this.delay(300 + Math.random() * 300);
    } catch (error) {
      throw this.handleError(error, 'type');
    }
  }

  /**
   * Select dropdown option
   */
  async select(sessionId, selector, value, options = {}) {
    return this.executeWithRetry('select', sessionId, selector, value, options);
  }

  async _select(sessionId, selector, value, options = {}) {
    try {
      await this.client.post(`/sessions/${sessionId}/select`, {
        selector,
        value,
        ...options
      });
      
      this.updateSessionActivity(sessionId);
      logger.info(`Selected: ${value} in ${selector}`);
      await this.delay(500);
    } catch (error) {
      throw this.handleError(error, 'select');
    }
  }

  /**
   * Extract data from elements
   */
  async extract(sessionId, selectors, options = {}) {
    return this.executeWithRetry('extract', sessionId, selectors, options);
  }

  async _extract(sessionId, selectors, options = {}) {
    try {
      const response = await this.client.post(`/sessions/${sessionId}/extract`, {
        selectors,
        timeout: options.timeout || 10000,
        multiple: options.multiple || false
      });
      
      this.updateSessionActivity(sessionId);
      return response.data.results;
    } catch (error) {
      throw this.handleError(error, 'extract');
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(sessionId, options = {}) {
    return this.executeWithRetry('screenshot', sessionId, options);
  }

  async _screenshot(sessionId, options = {}) {
    try {
      const response = await this.client.post(`/sessions/${sessionId}/screenshot`, {
        format: 'jpeg',
        quality: 80,
        fullPage: false,
        ...options
      });
      
      this.updateSessionActivity(sessionId);
      return response.data.screenshot;
    } catch (error) {
      throw this.handleError(error, 'screenshot');
    }
  }

  /**
   * Get cookies
   */
  async getCookies(sessionId) {
    return this.executeWithRetry('getCookies', sessionId);
  }

  async _getCookies(sessionId) {
    try {
      const response = await this.client.get(`/sessions/${sessionId}/cookies`);
      this.updateSessionActivity(sessionId);
      return response.data.cookies;
    } catch (error) {
      throw this.handleError(error, 'getCookies');
    }
  }

  /**
   * Set cookies
   */
  async setCookies(sessionId, cookies) {
    return this.executeWithRetry('setCookies', sessionId, cookies);
  }

  async _setCookies(sessionId, cookies) {
    try {
      await this.client.post(`/sessions/${sessionId}/cookies`, { cookies });
      this.updateSessionActivity(sessionId);
      logger.info(`Set ${cookies.length} cookies`);
    } catch (error) {
      throw this.handleError(error, 'setCookies');
    }
  }

  /**
   * Close session
   */
  async closeSession(sessionId) {
    try {
      await this.client.delete(`/sessions/${sessionId}`);
      this.sessions.delete(sessionId);
      logger.info(`Closed session: ${sessionId}`);
    } catch (error) {
      logger.warn(`Failed to close session ${sessionId}: ${error.message}`);
    }
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Handle and classify errors
   */
  handleError(error, operation) {
    const message = error.response?.data?.message || error.message;
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new TinyFishError(`Network error in ${operation}`, 'NETWORK', { originalError: error });
    }
    
    if (error.response?.status === 429) {
      return new TinyFishError(`Rate limit exceeded in ${operation}`, 'RATE_LIMIT', { originalError: error });
    }
    
    if (error.response?.status === 401 || message.includes('session')) {
      return new TinyFishError(`Session expired in ${operation}`, 'SESSION_EXPIRED', { originalError: error });
    }
    
    if (error.code === 'ECONNABORTED' || message.includes('timeout')) {
      return new TinyFishError(`Timeout in ${operation}`, 'TIMEOUT', { originalError: error });
    }
    
    if (message.includes('element') || message.includes('selector')) {
      return new TinyFishError(`Element not found in ${operation}`, 'EXTRACTION_FAILED', { originalError: error });
    }
    
    return new TinyFishError(`Unknown error in ${operation}: ${message}`, 'UNKNOWN', { originalError: error });
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TinyFishClient, TinyFishError };