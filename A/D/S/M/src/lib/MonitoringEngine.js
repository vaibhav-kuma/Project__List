const Bull = require('bull');
const logger = require('./logger');

/**
 * Monitoring engine for managing price tracking jobs
 */
class MonitoringEngine {
  constructor(redisConfig, dbClient) {
    this.dbClient = dbClient;
    this.queue = new Bull('price-monitoring', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });
    
    this.jobs = new Map(); // Active job tracking
    this.setupQueueEvents();
  }

  /**
   * Setup queue event handlers
   */
  setupQueueEvents() {
    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed:`, result);
      this.updateJobStatus(job.id, 'completed', result);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
      this.updateJobStatus(job.id, 'failed', { error: err.message });
    });

    this.queue.on('active', (job) => {
      logger.info(`Job ${job.id} started`);
      this.updateJobStatus(job.id, 'active');
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
      this.updateJobStatus(job.id, 'stalled');
    });
  }

  /**
   * Create a new monitoring job
   */
  async createJob(jobData) {
    try {
      const {
        name,
        searchQuery,
        filters = {},
        schedule = '0 */6 * * *', // Every 6 hours
        maxPages = 3,
        priceThreshold = 0.05, // 5% price change threshold
        userId = null
      } = jobData;

      // Save job to database
      const result = await this.dbClient.query(
        `INSERT INTO monitoring_jobs (name, search_query, filters, schedule_cron, max_pages, price_threshold, user_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
        [name, searchQuery, JSON.stringify(filters), schedule, maxPages, priceThreshold, userId, 'created']
      );

      const jobId = result.rows[0].id;

      // Add to Bull queue
      const bullJob = await this.queue.add('monitor-prices', {
        jobId,
        name,
        searchQuery,
        filters,
        maxPages,
        priceThreshold
      }, {
        repeat: { cron: schedule },
        jobId: `job-${jobId}`
      });

      this.jobs.set(jobId, {
        id: jobId,
        bullJobId: bullJob.id,
        status: 'created',
        createdAt: Date.now()
      });

      logger.info(`Created monitoring job: ${jobId}`);
      return { jobId, bullJobId: bullJob.id };
    } catch (error) {
      logger.error('Failed to create job:', error);
      throw error;
    }
  }

  /**
   * Run a monitoring job immediately
   */
  async runJob(jobId) {
    try {
      const jobData = await this.getJobData(jobId);
      if (!jobData) {
        throw new Error(`Job ${jobId} not found`);
      }

      const bullJob = await this.queue.add('monitor-prices', {
        jobId,
        ...jobData,
        immediate: true
      });

      logger.info(`Started immediate job run: ${jobId}`);
      return bullJob.id;
    } catch (error) {
      logger.error(`Failed to run job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a monitoring job
   */
  async stopJob(jobId) {
    try {
      // Update database status
      await this.dbClient.query(
        'UPDATE monitoring_jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['stopped', jobId]
      );

      // Remove from Bull queue
      const repeatableJobs = await this.queue.getRepeatableJobs();
      const targetJob = repeatableJobs.find(job => job.id === `job-${jobId}`);
      
      if (targetJob) {
        await this.queue.removeRepeatableByKey(targetJob.key);
      }

      // Update local tracking
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId).status = 'stopped';
      }

      logger.info(`Stopped monitoring job: ${jobId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to stop job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get job data from database
   */
  async getJobData(jobId) {
    try {
      const result = await this.dbClient.query(
        'SELECT * FROM monitoring_jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        name: row.name,
        searchQuery: row.search_query,
        filters: JSON.parse(row.filters || '{}'),
        maxPages: row.max_pages,
        priceThreshold: row.price_threshold,
        status: row.status
      };
    } catch (error) {
      logger.error(`Failed to get job data for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Update job status in database
   */
  async updateJobStatus(jobId, status, data = {}) {
    try {
      await this.dbClient.query(
        'UPDATE monitoring_jobs SET status = $1, last_run = NOW(), updated_at = NOW() WHERE id = $2',
        [status, jobId]
      );

      // Update local tracking
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId).status = status;
        this.jobs.get(jobId).lastUpdate = Date.now();
      }

      // Log execution data if provided
      if (data.results) {
        await this.logJobExecution(jobId, data);
      }
    } catch (error) {
      logger.error(`Failed to update job status for ${jobId}:`, error);
    }
  }

  /**
   * Log job execution results
   */
  async logJobExecution(jobId, data) {
    try {
      const { results = [], errors = [], duration = 0 } = data;
      
      await this.dbClient.query(
        `INSERT INTO job_executions (job_id, products_found, errors, duration_ms, executed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [jobId, results.length, JSON.stringify(errors), duration]
      );

      // Store price snapshots
      for (const product of results) {
        await this.storePriceSnapshot(jobId, product);
      }
    } catch (error) {
      logger.error(`Failed to log job execution for ${jobId}:`, error);
    }
  }

  /**
   * Store price snapshot and detect changes
   */
  async storePriceSnapshot(jobId, product) {
    try {
      const { title, price, productUrl, rating, reviewCount } = product;
      
      if (!price || !productUrl) {
        return;
      }

      // Get previous price
      const previousResult = await this.dbClient.query(
        `SELECT price FROM price_snapshots 
         WHERE job_id = $1 AND product_url = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [jobId, productUrl]
      );

      const previousPrice = previousResult.rows[0]?.price;
      const priceChange = previousPrice ? ((price - previousPrice) / previousPrice) : 0;

      // Store new snapshot
      await this.dbClient.query(
        `INSERT INTO price_snapshots (job_id, product_title, product_url, price, rating, review_count, price_change, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [jobId, title, productUrl, price, rating, reviewCount, priceChange]
      );

      // Check for significant price changes
      const jobData = await this.getJobData(jobId);
      if (jobData && Math.abs(priceChange) >= jobData.priceThreshold) {
        await this.createPriceAlert(jobId, product, priceChange, previousPrice);
      }
    } catch (error) {
      logger.error('Failed to store price snapshot:', error);
    }
  }

  /**
   * Create price change alert
   */
  async createPriceAlert(jobId, product, priceChange, previousPrice) {
    try {
      const alertType = priceChange > 0 ? 'price_increase' : 'price_decrease';
      const changePercent = Math.abs(priceChange * 100);

      await this.dbClient.query(
        `INSERT INTO price_alerts (job_id, product_title, product_url, alert_type, previous_price, current_price, change_percent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [jobId, product.title, product.productUrl, alertType, previousPrice, product.price, changePercent]
      );

      logger.info(`Price alert created for job ${jobId}: ${product.title} - ${changePercent.toFixed(1)}% ${alertType}`);
    } catch (error) {
      logger.error('Failed to create price alert:', error);
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(jobId) {
    try {
      const stats = await this.dbClient.query(`
        SELECT 
          COUNT(DISTINCT ps.product_url) as unique_products,
          COUNT(ps.id) as total_snapshots,
          COUNT(pa.id) as total_alerts,
          AVG(ps.price) as avg_price,
          MIN(ps.price) as min_price,
          MAX(ps.price) as max_price,
          COUNT(CASE WHEN pa.alert_type = 'price_decrease' THEN 1 END) as price_drops,
          COUNT(CASE WHEN pa.alert_type = 'price_increase' THEN 1 END) as price_increases
        FROM price_snapshots ps
        LEFT JOIN price_alerts pa ON ps.job_id = pa.job_id AND ps.product_url = pa.product_url
        WHERE ps.job_id = $1
      `, [jobId]);

      return stats.rows[0] || {};
    } catch (error) {
      logger.error(`Failed to get job stats for ${jobId}:`, error);
      return {};
    }
  }

  /**
   * Get recent alerts for a job
   */
  async getRecentAlerts(jobId, limit = 10) {
    try {
      const result = await this.dbClient.query(`
        SELECT * FROM price_alerts 
        WHERE job_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [jobId, limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Failed to get recent alerts for ${jobId}:`, error);
      return [];
    }
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(jobId, productUrl, days = 30) {
    try {
      const result = await this.dbClient.query(`
        SELECT price, created_at 
        FROM price_snapshots 
        WHERE job_id = $1 AND product_url = $2 AND created_at > NOW() - INTERVAL '${days} days'
        ORDER BY created_at ASC
      `, [jobId, productUrl]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get price history:', error);
      return [];
    }
  }

  /**
   * Clean up old data
   */
  async cleanup(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
      
      // Clean old snapshots
      const snapshotResult = await this.dbClient.query(
        'DELETE FROM price_snapshots WHERE created_at < $1',
        [cutoffDate]
      );

      // Clean old job executions
      const executionResult = await this.dbClient.query(
        'DELETE FROM job_executions WHERE executed_at < $1',
        [cutoffDate]
      );

      logger.info(`Cleanup completed: ${snapshotResult.rowCount} snapshots, ${executionResult.rowCount} executions removed`);
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();
      const delayed = await this.queue.getDelayed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: this.jobs.size
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return {};
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down monitoring engine...');
      await this.queue.close();
      logger.info('Monitoring engine shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

module.exports = MonitoringEngine;