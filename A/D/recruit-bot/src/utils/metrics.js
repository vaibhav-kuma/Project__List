const logger = require('./logger');

class Metrics {
  constructor() {
    this.data = {
      jobs: {
        total: 0,
        completed: 0,
        failed: 0,
        totalDuration: 0,
      },
      linkedin: {
        sessions: 0,
        logins: 0,
        loginFailures: 0,
        searches: 0,
        candidatesExtracted: 0,
        profilesEnriched: 0,
        errors: {},
      },
      errors: {
        NAVIGATION: 0,
        EXTRACTION: 0,
        AUTH: 0,
        RATE_LIMIT: 0,
        SESSION: 0,
      },
      retries: {
        total: 0,
        successful: 0,
        failed: 0,
      },
    };
  }

  recordJobStart() {
    this.data.jobs.total++;
  }

  recordJobComplete(durationSec) {
    this.data.jobs.completed++;
    this.data.jobs.totalDuration += durationSec;
  }

  recordJobFailed() {
    this.data.jobs.failed++;
  }

  recordLinkedInSession() {
    this.data.linkedin.sessions++;
  }

  recordLinkedInLogin(success = true) {
    if (success) {
      this.data.linkedin.logins++;
    } else {
      this.data.linkedin.loginFailures++;
    }
  }

  recordLinkedInSearch() {
    this.data.linkedin.searches++;
  }

  recordCandidatesExtracted(count) {
    this.data.linkedin.candidatesExtracted += count;
  }

  recordProfileEnriched() {
    this.data.linkedin.profilesEnriched++;
  }

  recordError(type) {
    if (this.data.errors[type]) {
      this.data.errors[type]++;
    }
  }

  recordRetry(success = true) {
    this.data.retries.total++;
    if (success) {
      this.data.retries.successful++;
    } else {
      this.data.retries.failed++;
    }
  }

  getStats() {
    const avgJobDuration =
      this.data.jobs.completed > 0
        ? (this.data.jobs.totalDuration / this.data.jobs.completed).toFixed(1)
        : 0;

    const successRate =
      this.data.jobs.total > 0
        ? ((this.data.jobs.completed / this.data.jobs.total) * 100).toFixed(1)
        : 0;

    const retrySuccessRate =
      this.data.retries.total > 0
        ? ((this.data.retries.successful / this.data.retries.total) * 100).toFixed(1)
        : 0;

    return {
      jobs: {
        total: this.data.jobs.total,
        completed: this.data.jobs.completed,
        failed: this.data.jobs.failed,
        successRate: `${successRate}%`,
        avgDurationSec: avgJobDuration,
      },
      linkedin: {
        sessions: this.data.linkedin.sessions,
        logins: this.data.linkedin.logins,
        loginFailures: this.data.linkedin.loginFailures,
        searches: this.data.linkedin.searches,
        candidatesExtracted: this.data.linkedin.candidatesExtracted,
        profilesEnriched: this.data.linkedin.profilesEnriched,
        avgCandidatesPerSearch:
          this.data.linkedin.searches > 0
            ? (this.data.linkedin.candidatesExtracted / this.data.linkedin.searches).toFixed(0)
            : 0,
      },
      errors: this.data.errors,
      retries: {
        total: this.data.retries.total,
        successful: this.data.retries.successful,
        failed: this.data.retries.failed,
        successRate: `${retrySuccessRate}%`,
      },
    };
  }

  log() {
    const stats = this.getStats();
    logger.info('=== Metrics Summary ===', stats);
    return stats;
  }

  reset() {
    this.data = {
      jobs: { total: 0, completed: 0, failed: 0, totalDuration: 0 },
      linkedin: {
        sessions: 0,
        logins: 0,
        loginFailures: 0,
        searches: 0,
        candidatesExtracted: 0,
        profilesEnriched: 0,
        errors: {},
      },
      errors: { NAVIGATION: 0, EXTRACTION: 0, AUTH: 0, RATE_LIMIT: 0, SESSION: 0 },
      retries: { total: 0, successful: 0, failed: 0 },
    };
  }
}

module.exports = new Metrics();
