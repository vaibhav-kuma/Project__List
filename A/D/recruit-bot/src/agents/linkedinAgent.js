const TinyFishClient = require('../api/tinyfish');
const LinkedInAuth = require('./linkedinAuth');
const LinkedInSearch = require('./linkedinSearch');
const { sleep } = require('../utils/helpers');
const logger = require('../utils/logger');

const RATE_LIMIT_WAIT = parseInt(process.env.RATE_LIMIT_WAIT_MS, 10) || 60000;
const MAX_ENRICH = 20; // enrich top N candidates

class LinkedInAgent {
  constructor() {
    this.client = new TinyFishClient();
    this.auth = new LinkedInAuth(this.client);
    this.search = new LinkedInSearch(this.client);
    this.sessionId = null;
  }

  async _initSession() {
    const session = await this.client.createSession({
      viewport: { width: 1440, height: 900 },
    });
    this.sessionId = session.sessionId;
    const viewerUrl = await this.client.getSessionViewerUrl(this.sessionId);
    logger.info('Live session viewer ready', { viewerUrl });
    return viewerUrl;
  }

  async _recoverSession() {
    logger.warn('Recovering broken session');
    try {
      if (this.sessionId) await this.client.closeSession(this.sessionId).catch(() => {});
    } finally {
      this.sessionId = null;
    }
    await this._initSession();
    await this.auth.ensureAuthenticated(this.sessionId);
  }

  // Main entry point
  // query: { title, location, keywords[], maxCandidates, enrichTopN }
  async run(query) {
    const {
      title,
      location,
      keywords = [],
      maxCandidates = 50,
      enrichTopN = MAX_ENRICH,
    } = query;

    const startTime = Date.now();
    logger.info('LinkedIn agent starting', { title, location, keywords, maxCandidates });

    const viewerUrl = await this._initSession();

    try {
      // Step 1: Authenticate
      await this.auth.ensureAuthenticated(this.sessionId);

      // Step 2: Apply search filters
      await this._withRateLimitRecovery(() =>
        this.search.applyFilters(this.sessionId, { title, location, keywords })
      );

      // Step 3: Paginate and extract candidates
      const maxPages = Math.ceil(maxCandidates / 10);
      let candidates = await this._withRateLimitRecovery(() =>
        this.search.scrapePages(this.sessionId, maxPages)
      );

      // Deduplicate by profileUrl
      const seen = new Set();
      candidates = candidates.filter((c) => {
        if (seen.has(c.profileUrl)) return false;
        seen.add(c.profileUrl);
        return true;
      });

      logger.info(`Extracted ${candidates.length} unique candidates`);

      // Step 4: Enrich top N profiles
      const toEnrich = candidates.slice(0, enrichTopN);
      const enriched = [];

      for (const candidate of toEnrich) {
        try {
          const full = await this._withRateLimitRecovery(() =>
            this.search.enrichProfile(this.sessionId, candidate)
          );
          enriched.push(full);
        } catch (err) {
          logger.warn('Profile enrichment failed, using partial data', {
            name: candidate.name,
            error: err.message,
          });
          enriched.push(candidate);
        }
        await sleep(1000); // polite inter-profile delay
      }

      // Merge: enriched profiles + remaining un-enriched
      const enrichedUrls = new Set(enriched.map((c) => c.profileUrl));
      const remaining = candidates.filter((c) => !enrichedUrls.has(c.profileUrl));
      const results = [...enriched, ...remaining];

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info('LinkedIn agent complete', {
        total: results.length,
        enriched: enriched.length,
        durationSec: duration,
      });

      return { candidates: results, viewerUrl, durationSec: parseFloat(duration) };
    } catch (err) {
      logger.error('LinkedIn agent fatal error', { error: err.message });
      throw err;
    } finally {
      if (this.sessionId) await this.client.closeSession(this.sessionId).catch(() => {});
    }
  }

  // Wraps any operation with rate-limit detection and session-recovery
  async _withRateLimitRecovery(fn) {
    try {
      return await fn();
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';

      if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
        logger.warn(`Rate limited — waiting ${RATE_LIMIT_WAIT / 1000}s`);
        await sleep(RATE_LIMIT_WAIT);
        return await fn(); // one retry after wait
      }

      if (msg.includes('session') || msg.includes('401') || msg.includes('unauthorized')) {
        await this._recoverSession();
        return await fn();
      }

      throw err;
    }
  }
}

module.exports = LinkedInAgent;
