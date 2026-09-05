const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message });
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Query executed', { duration, rows: res.rowCount });
      return res;
    } catch (err) {
      logger.error('Query failed', { error: err.message, query: text });
      throw err;
    }
  }

  async createJob(jobData) {
    const { title, location, skills, maxCandidates, enrichTopN } = jobData;
    const res = await this.query(
      `INSERT INTO jobs (title, location, skills, max_candidates, enrich_top_n, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [title, location, JSON.stringify(skills), maxCandidates, enrichTopN]
    );
    return res.rows[0];
  }

  async getJob(jobId) {
    const res = await this.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    return res.rows[0];
  }

  async updateJobStatus(jobId, status, updates = {}) {
    const fields = ['status = $2'];
    const values = [jobId, status];
    let idx = 3;

    if (updates.progress !== undefined) {
      fields.push(`progress = $${idx++}`);
      values.push(updates.progress);
    }
    if (updates.error) {
      fields.push(`error = $${idx++}`);
      values.push(updates.error);
    }
    if (updates.metadata) {
      fields.push(`metadata = $${idx++}`);
      values.push(JSON.stringify(updates.metadata));
    }
    if (status === 'running' && !updates.started_at) {
      fields.push('started_at = NOW()');
    }
    if (status === 'completed' || status === 'failed') {
      fields.push('completed_at = NOW()');
    }

    await this.query(`UPDATE jobs SET ${fields.join(', ')} WHERE id = $1`, values);
  }

  async saveCandidates(jobId, candidates) {
    if (candidates.length === 0) return;

    const values = [];
    const placeholders = [];
    let idx = 1;

    for (const c of candidates) {
      placeholders.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      values.push(
        jobId,
        c.name,
        c.headline || null,
        c.location || null,
        c.profileUrl || null,
        c.imageUrl || null,
        c.email || null,
        c.about || null,
        JSON.stringify(c.experience || []),
        JSON.stringify(c.education || []),
        JSON.stringify(c.skills || []),
        JSON.stringify(c.sources || [c.source]),
        c.score || 0,
        JSON.stringify(c.scoreBreakdown || {})
      );
    }

    await this.query(
      `INSERT INTO candidates (job_id, name, headline, location, profile_url, image_url, email, about, experience, education, skills, sources, score, score_breakdown)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    logger.info('Candidates saved to database', { jobId, count: candidates.length });
  }

  async getCandidates(jobId, limit = 100) {
    const res = await this.query(
      'SELECT * FROM candidates WHERE job_id = $1 ORDER BY score DESC LIMIT $2',
      [jobId, limit]
    );
    return res.rows.map((row) => ({
      ...row,
      skills: row.skills,
      experience: row.experience,
      education: row.education,
      sources: row.sources,
      scoreBreakdown: row.score_breakdown,
    }));
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();
