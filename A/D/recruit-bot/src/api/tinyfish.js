const axios = require('axios');
const logger = require('../utils/logger');

class TinyFishClient {
  constructor() {
    this.apiKey = process.env.TINYFISH_API_KEY;
    this.baseURL = process.env.TINYFISH_BASE_URL || 'https://api.tinyfish.io/v1';

    if (!this.apiKey) throw new Error('TINYFISH_API_KEY is required');

    this.http = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    this.http.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        logger.error('TinyFish API error', { status, message });
        throw Object.assign(new Error(message), { status, original: err });
      }
    );
  }

  async createSession(options = {}) {
    const { data } = await this.http.post('/sessions', {
      headless: options.headless ?? true,
      viewport: options.viewport ?? { width: 1280, height: 800 },
      userAgent: options.userAgent,
      cookies: options.cookies ?? [],
    });
    logger.info('Session created', { sessionId: data.sessionId });
    return data;
  }

  async navigate(sessionId, url, options = {}) {
    const { data } = await this.http.post(`/sessions/${sessionId}/navigate`, {
      url,
      waitUntil: options.waitUntil ?? 'networkidle',
      timeout: options.timeout ?? 30000,
    });
    logger.debug('Navigated', { sessionId, url, status: data.status });
    return data;
  }

  // execute: run arbitrary browser actions (click, type, select, wait, scroll)
  async execute(sessionId, actions) {
    const normalized = Array.isArray(actions) ? actions : [actions];
    const { data } = await this.http.post(`/sessions/${sessionId}/execute`, {
      actions: normalized,
    });
    logger.debug('Executed actions', { sessionId, count: normalized.length });
    return data;
  }

  // extract: pull structured data from the page using selectors or AI instructions
  async extract(sessionId, schema) {
    const { data } = await this.http.post(`/sessions/${sessionId}/extract`, {
      schema,
    });
    logger.debug('Extracted data', { sessionId, keys: Object.keys(schema) });
    return data;
  }

  async getCookies(sessionId) {
    const { data } = await this.http.get(`/sessions/${sessionId}/cookies`);
    return data.cookies;
  }

  async setCookies(sessionId, cookies) {
    await this.http.post(`/sessions/${sessionId}/cookies`, { cookies });
  }

  async screenshot(sessionId) {
    const { data } = await this.http.get(`/sessions/${sessionId}/screenshot`);
    return data.screenshot; // base64
  }

  async getSessionViewerUrl(sessionId) {
    const { data } = await this.http.get(`/sessions/${sessionId}/viewer`);
    return data.viewerUrl;
  }

  async closeSession(sessionId) {
    await this.http.delete(`/sessions/${sessionId}`);
    logger.info('Session closed', { sessionId });
  }
}

module.exports = TinyFishClient;
