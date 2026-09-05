const express = require('express');
const Joi = require('joi');
const MonitoringEngine = require('../lib/MonitoringEngine');
const dbClient = require('../db/client');
const logger = require('../lib/logger');

const router = express.Router();

// Initialize monitoring engine
const monitoringEngine = new MonitoringEngine({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
}, dbClient);

/**
 * Validation schemas
 */
const createJobSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  searchQuery: Joi.string().min(1).max(500).required(),
  filters: Joi.object({
    priceMin: Joi.number().min(0).optional(),
    priceMax: Joi.number().min(0).optional(),
    minRating: Joi.number().min(1).max(5).optional(),
    primeOnly: Joi.boolean().optional()
  }).optional(),
  schedule: Joi.string().pattern(/^[0-9\*\/\-\,\s]+$/).optional(),
  maxPages: Joi.number().min(1).max(10).default(3),
  priceThreshold: Joi.number().min(0).max(1).default(0.05),
  amazonEmail: Joi.string().email().optional(),
  amazonPassword: Joi.string().min(6).optional()
});

/**
 * Response wrapper
 */
const sendResponse = (res, data = null, error = null, status = 200) => {
  res.status(status).json({
    success: !error,
    data,
    error: error?.message || error,
    timestamp: new Date().toISOString()
  });
};

/**
 * POST /jobs - Create new monitoring job
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = createJobSchema.validate(req.body);
    if (error) {
      return sendResponse(res, null, error.details[0].message, 400);
    }

    const jobData = {
      ...value,
      userId: req.headers['x-user-id'] || null
    };

    const result = await monitoringEngine.createJob(jobData);
    
    logger.info(`Created job: ${result.jobId}`);
    sendResponse(res, result, null, 201);
  } catch (error) {
    logger.error('Failed to create job:', error);
    sendResponse(res, null, 'Failed to create monitoring job', 500);
  }
});

/**
 * GET /jobs - List all monitoring jobs
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [limit, offset];
    let paramIndex = 3;

    if (status) {
      whereClause += ` WHERE status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (userId) {
      whereClause += status ? ' AND' : ' WHERE';
      whereClause += ` user_id = $${paramIndex}`;
      params.push(userId);
    }

    const query = `
      SELECT 
        id, name, search_query, filters, status, schedule_cron,
        max_pages, price_threshold, last_run, created_at, updated_at
      FROM monitoring_jobs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;

    const result = await dbClient.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM monitoring_jobs ${whereClause}`;
    const countParams = params.slice(2); // Remove limit and offset
    const countResult = await dbClient.query(countQuery, countParams);
    
    const jobs = result.rows.map(job => ({
      ...job,
      filters: typeof job.filters === 'string' ? JSON.parse(job.filters) : job.filters
    }));

    sendResponse(res, {
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to list jobs:', error);
    sendResponse(res, null, 'Failed to retrieve jobs', 500);
  }
});

/**
 * GET /jobs/:id - Get specific job details
 */
router.get('/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return sendResponse(res, null, 'Invalid job ID', 400);
    }

    const result = await dbClient.query(
      'SELECT * FROM monitoring_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      return sendResponse(res, null, 'Job not found', 404);
    }

    const job = result.rows[0];
    job.filters = typeof job.filters === 'string' ? JSON.parse(job.filters) : job.filters;

    // Get job statistics
    const stats = await monitoringEngine.getJobStats(jobId);

    sendResponse(res, { job, stats });
  } catch (error) {
    logger.error(`Failed to get job ${req.params.id}:`, error);
    sendResponse(res, null, 'Failed to retrieve job', 500);
  }
});

/**
 * POST /jobs/:id/run - Run job immediately
 */
router.post('/:id/run', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return sendResponse(res, null, 'Invalid job ID', 400);
    }

    const bullJobId = await monitoringEngine.runJob(jobId);
    
    logger.info(`Started immediate run for job ${jobId}`);
    sendResponse(res, { jobId, bullJobId, message: 'Job started successfully' });
  } catch (error) {
    logger.error(`Failed to run job ${req.params.id}:`, error);
    sendResponse(res, null, error.message, 500);
  }
});

/**
 * PUT /jobs/:id/stop - Stop monitoring job
 */
router.put('/:id/stop', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return sendResponse(res, null, 'Invalid job ID', 400);
    }

    await monitoringEngine.stopJob(jobId);
    
    logger.info(`Stopped job ${jobId}`);
    sendResponse(res, { jobId, message: 'Job stopped successfully' });
  } catch (error) {
    logger.error(`Failed to stop job ${req.params.id}:`, error);
    sendResponse(res, null, 'Failed to stop job', 500);
  }
});

/**
 * DELETE /jobs/:id - Delete monitoring job
 */
router.delete('/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return sendResponse(res, null, 'Invalid job ID', 400);
    }

    // Stop the job first
    try {
      await monitoringEngine.stopJob(jobId);
    } catch (error) {
      logger.warn(`Failed to stop job ${jobId} before deletion:`, error.message);
    }

    // Delete from database (cascading deletes will handle related records)
    const result = await dbClient.query(
      'DELETE FROM monitoring_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rowCount === 0) {
      return sendResponse(res, null, 'Job not found', 404);
    }

    logger.info(`Deleted job ${jobId}`);
    sendResponse(res, { jobId, message: 'Job deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete job ${req.params.id}:`, error);
    sendResponse(res, null, 'Failed to delete job', 500);
  }
});

/**
 * GET /jobs/:id/alerts - Get price alerts for job
 */
router.get('/:id/alerts', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return sendResponse(res, null, 'Invalid job ID', 400);
    }

    const { limit = 50, type } = req.query;
    
    let whereClause = 'WHERE job_id = $1';
    const params = [jobId, limit];
    
    if (type) {
      whereClause += ' AND alert_type = $3';
      params.push(type);
    }

    const result = await dbClient.query(`
      SELECT * FROM price_alerts 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $2
    `, params);

    sendResponse(res, { alerts: result.rows });
  } catch (error) {
    logger.error(`Failed to get alerts for job ${req.params.id}:`, error);
    sendResponse(res, null, 'Failed to retrieve alerts', 500);
  }
});

/**
 * GET /jobs/:id/history - Get price history for job
 */
router.get('/:id/history', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return sendResponse(res, null, 'Invalid job ID', 400);
    }

    const { days = 30, productUrl } = req.query;
    
    let whereClause = 'WHERE job_id = $1 AND created_at > NOW() - INTERVAL \'$2 days\'';
    const params = [jobId, days];
    
    if (productUrl) {
      whereClause += ' AND product_url = $3';
      params.push(productUrl);
    }

    const result = await dbClient.query(`
      SELECT 
        product_title, product_url, price, rating, review_count,
        price_change, created_at
      FROM price_snapshots 
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    // Group by product URL for better organization
    const groupedHistory = {};
    result.rows.forEach(row => {
      if (!groupedHistory[row.product_url]) {
        groupedHistory[row.product_url] = {
          title: row.product_title,
          url: row.product_url,
          history: []
        };
      }
      groupedHistory[row.product_url].history.push({
        price: parseFloat(row.price),
        rating: parseFloat(row.rating),
        reviewCount: row.review_count,
        priceChange: parseFloat(row.price_change),
        timestamp: row.created_at
      });
    });

    sendResponse(res, { 
      products: Object.values(groupedHistory),
      totalSnapshots: result.rows.length 
    });
  } catch (error) {
    logger.error(`Failed to get history for job ${req.params.id}:`, error);
    sendResponse(res, null, 'Failed to retrieve price history', 500);
  }
});

/**
 * GET /dashboard/stats - Get dashboard statistics
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await dbClient.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'active') as active_jobs,
        COUNT(*) FILTER (WHERE status = 'paused') as paused_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs
      FROM monitoring_jobs
    `);

    const alertStats = await dbClient.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE alert_type = 'price_decrease') as price_drops,
        COUNT(*) FILTER (WHERE alert_type = 'price_increase') as price_increases,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as alerts_24h
      FROM price_alerts
    `);

    const productStats = await dbClient.query(`
      SELECT 
        COUNT(DISTINCT product_url) as unique_products,
        COUNT(*) as total_snapshots,
        AVG(price) as avg_price,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as snapshots_24h
      FROM price_snapshots
    `);

    // Get queue statistics
    const queueStats = await monitoringEngine.getQueueStats();

    // Calculate ROI metrics
    const roiMetrics = {
      manualHoursPerWeek: 20,
      hourlyRate: 25,
      monthlyCost: 200,
      weeklySavings: 20 * 25, // $500
      monthlySavings: 20 * 25 * 4.33, // $2,165
      roi: ((20 * 25 * 4.33 - 200) / 200 * 100).toFixed(1) // 982.5%
    };

    sendResponse(res, {
      jobs: stats.rows[0],
      alerts: alertStats.rows[0],
      products: productStats.rows[0],
      queue: queueStats,
      roi: roiMetrics
    });
  } catch (error) {
    logger.error('Failed to get dashboard stats:', error);
    sendResponse(res, null, 'Failed to retrieve dashboard statistics', 500);
  }
});

/**
 * PUT /alerts/:id/read - Mark alert as read
 */
router.put('/alerts/:id/read', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      return sendResponse(res, null, 'Invalid alert ID', 400);
    }

    const result = await dbClient.query(
      'UPDATE price_alerts SET is_read = true WHERE id = $1',
      [alertId]
    );

    if (result.rowCount === 0) {
      return sendResponse(res, null, 'Alert not found', 404);
    }

    sendResponse(res, { alertId, message: 'Alert marked as read' });
  } catch (error) {
    logger.error(`Failed to mark alert ${req.params.id} as read:`, error);
    sendResponse(res, null, 'Failed to update alert', 500);
  }
});

module.exports = router;