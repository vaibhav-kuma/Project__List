const logger = require('../utils/logger');

class Deduplicator {
  // Extract a unique key from a candidate (profileUrl or email)
  static getKey(candidate) {
    if (candidate.profileUrl) {
      // Normalize LinkedIn URLs: remove query params, trailing slashes
      const url = candidate.profileUrl.split('?')[0].replace(/\/$/, '');
      return url.toLowerCase();
    }
    if (candidate.email) {
      return candidate.email.toLowerCase();
    }
    // Fallback: name + location (weak but better than nothing)
    return `${candidate.name}|${candidate.location || ''}`.toLowerCase();
  }

  // Merge two candidate records, preferring the one with more data
  static merge(existing, incoming) {
    const merged = { ...existing };

    // Merge sources
    merged.sources = [...new Set([...(existing.sources || [existing.source]), incoming.source])];
    delete merged.source;

    // Prefer non-empty fields from incoming
    for (const key of Object.keys(incoming)) {
      if (key === 'source' || key === 'sources') continue;

      const incomingVal = incoming[key];
      const existingVal = existing[key];

      // If existing is empty/null and incoming has value, use incoming
      if (
        (!existingVal || (Array.isArray(existingVal) && existingVal.length === 0)) &&
        incomingVal &&
        !(Array.isArray(incomingVal) && incomingVal.length === 0)
      ) {
        merged[key] = incomingVal;
      }

      // Merge arrays (skills, experience, education)
      if (Array.isArray(existingVal) && Array.isArray(incomingVal)) {
        merged[key] = [...existingVal, ...incomingVal];
      }
    }

    return merged;
  }

  // Deduplicate an array of candidates
  static deduplicate(candidates) {
    const map = new Map();

    for (const candidate of candidates) {
      const key = this.getKey(candidate);

      if (map.has(key)) {
        const existing = map.get(key);
        const merged = this.merge(existing, candidate);
        map.set(key, merged);
        logger.debug('Merged duplicate candidate', { name: candidate.name, key });
      } else {
        map.set(key, { ...candidate, sources: [candidate.source] });
      }
    }

    const deduplicated = Array.from(map.values());
    logger.info('Deduplication complete', {
      before: candidates.length,
      after: deduplicated.length,
      duplicates: candidates.length - deduplicated.length,
    });

    return deduplicated;
  }
}

module.exports = Deduplicator;
