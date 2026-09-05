require('dotenv').config();
const Bull = require('bull');
const { TinyFishClient } = require('./lib/TinyFishClient');
const AmazonAgent = require('./agents/AmazonAgent');
const SessionManager = require('./lib/SessionManager');
const AgentBroadcaster = require('./lib/AgentBroadcaster');
const dbClient = require('./db/client');
const logger = require('./lib/logger');

/**
 * Bull queue worker for processing price monitoring jobs
 */
class MonitoringWorker {
  constructor() {
    this.queue = new Bull('price-monitoring', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });

    this.tinyFishClient = new TinyFishClient(process.env.TINYFISH_API_KEY);
    this.sessionManager = new SessionManager(dbClient);
    this.broadcaster = new AgentBroadcaster();
    
    this.setupWorker();
    this.setupGracefulShutdown();
  }

  /**
   * Setup queue worker with job processing
   */
  setupWorker() {
    this.queue.process('monitor-prices', 3, async (job) => {
      const startTime = Date.now();
      const { jobId, searchQuery, filters, maxPages, priceThreshold } = job.data;
      
      logger.info(`Processing job ${jobId}: ${searchQuery}`);
      
      try {
        // Update job progress
        await job.progress(10);
        
        // Create agent with broadcaster
        const agent = new AmazonAgent(
          this.tinyFishClient,
          this.sessionManager,
          this.broadcaster.getNamespace(`/agent/${jobId}`)
        );

        // Login (if credentials available)
        const credentials = await this.getJobCredentials(jobId);
        if (credentials) {
          await agent.login(credentials.email, credentials.password);
          await job.progress(30);
        }

        // Search and filter
        await agent.searchAndFilter(searchQuery, filters);
        await job.progress(50);

        // Extract results
        const results = await agent.extractPaginatedResults(maxPages);
        await job.progress(80);

        // Process results for price changes
        const processedResults = await this.processResults(jobId, results, priceThreshold);
        await job.progress(90);

        // Cleanup
        await agent.close();
        await job.progress(100);

        const duration = Date.now() - startTime;
        logger.info(`Job ${jobId} completed in ${duration}ms: ${results.length} products found`);

        return {
          jobId,
          productsFound: results.length,
          priceAlerts: processedResults.alerts.length,
          duration,
          results: processedResults.products
        };

      } catch (error) {
        logger.error(`Job ${jobId} failed:`, error);
        
        // Broadcast error
        this.broadcaster.getNamespace(`/agent/${jobId}`).emit('job-error', {
          jobId,
          error: error.message,
          timestamp: Date.now()
        });

        throw error;
      }
    });

    // Setup queue event handlers
    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`);
      this.updateJobStatus(result.jobId, 'completed', result);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err.message);
      this.updateJobStatus(job.data.jobId, 'failed', { error: err.message });
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
      this.updateJobStatus(job.data.jobId, 'stalled');
    });
  }

  /**
   * Get job credentials from database
   */
  async getJobCredentials(jobId) {
    try {
      const result = await dbClient.query(
        'SELECT amazon_email, amazon_password FROM monitoring_jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length > 0 && result.rows[0].amazon_email) {
        return {
          email: result.rows[0].amazon_email,
          password: result.rows[0].amazon_password
        };
      }
      
      return null;
    } catch (error) {
      logger.warn(`Failed to get credentials for job ${jobId}:`, error.message);
      return null;
    }
  }

  /**
   * Process results and detect price changes
   */
  async processResults(jobId, results, priceThreshold) {
    const processedProducts = [];
    const alerts = [];

    for (const product of results) {
      try {
        // Store price snapshot
        const priceChange = await this.storePriceSnapshot(jobId, product);
        
        processedProducts.push({
          ...product,
          priceChange
        });

        // Check for significant price changes
        if (Math.abs(priceChange) >= priceThreshold) {
          const alert = await this.createPriceAlert(jobId, product, priceChange);
          if (alert) {
            alerts.push(alert);
          }
        }
      } catch (error) {
        logger.warn(`Failed to process product ${product.title}:`, error.message);
      }
    }

    return { products: processedProducts, alerts };
  }

  /**
   * Store price snapshot in database
   */
  async storePriceSnapshot(jobId, product) {
    try {
      const { title, price, productUrl, rating, reviewCount } = product;
      
      if (!price || !productUrl) {
        return 0;
      }

      // Get previous price
      const previousResult = await dbClient.query(
        `SELECT price FROM price_snapshots 
         WHERE job_id = $1 AND product_url = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [jobId, productUrl]
      );

      const previousPrice = previousResult.rows[0]?.price;
      const priceChange = previousPrice ? ((price - previousPrice) / previousPrice) : 0;

      // Store new snapshot
      await dbClient.query(
        `INSERT INTO price_snapshots (job_id, product_title, product_url, price, rating, review_count, price_change, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [jobId, title, productUrl, price, rating, reviewCount, priceChange]
      );

      return priceChange;
    } catch (error) {
      logger.error('Failed to store price snapshot:', error);
      return 0;
    }
  }

  /**
   * Create price alert
   */
  async createPriceAlert(jobId, product, priceChange) {
    try {
      const alertType = priceChange > 0 ? 'price_increase' : 'price_decrease';
      const changePercent = Math.abs(priceChange * 100);

      const result = await dbClient.query(
        `INSERT INTO price_alerts (job_id, product_title, product_url, alert_type, previous_price, current_price, change_percent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
        [jobId, product.title, product.productUrl, alertType, product.price * (1 - priceChange), product.price, changePercent]
      );

      const alert = {
        id: result.rows[0].id,
        jobId,
        productTitle: product.title,
        productUrl: product.productUrl,
        alertType,
        changePercent,
        currentPrice: product.price
      };

      // Broadcast alert
      this.broadcaster.getNamespace(`/agent/${jobId}`).emit('price-alert', alert);

      logger.info(`Price alert created: ${product.title} - ${changePercent.toFixed(1)}% ${alertType}`);
      return alert;
    } catch (error) {
      logger.error('Failed to create price alert:', error);
      return null;
    }
  }

  /**
   * Update job status in database
   */
  async updateJobStatus(jobId, status, data = {}) {
    try {
      await dbClient.query(
        'UPDATE monitoring_jobs SET status = $1, last_run = NOW(), updated_at = NOW() WHERE id = $2',
        [status, jobId]
      );

      // Log execution if data provided
      if (data.productsFound !== undefined) {
        await dbClient.query(
          `INSERT INTO job_executions (job_id, products_found, errors, duration_ms, executed_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [jobId, data.productsFound || 0, JSON.stringify(data.error ? [data.error] : []), data.duration || 0]
        );
      }
    } catch (error) {
      logger.error(`Failed to update job status for ${jobId}:`, error);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down worker gracefully...`);
      
      try {
        await this.queue.close();
        await dbClient.end();
        logger.info('Worker shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Start the worker
   */
  start() {
    logger.info('Starting monitoring worker...');
    logger.info(`Worker PID: ${process.pid}`);
    logger.info(`Concurrency: 3 jobs`);
    logger.info(`Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  const worker = new MonitoringWorker();
  worker.start();
}

module.exports = MonitoringWorker;