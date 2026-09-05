require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const recruitmentQueue = require('./api/queue');
const db = require('./db/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/jobs - Create a new recruitment job
app.post(
  '/api/jobs',
  [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('location').optional().isString(),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    body('maxCandidates').optional().isInt({ min: 1, max: 200 }).withMessage('maxCandidates must be 1-200'),
    body('enrichTopN').optional().isInt({ min: 0, max: 100 }).withMessage('enrichTopN must be 0-100'),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, location, skills = [], maxCandidates = 50, enrichTopN = 20 } = req.body;

      // Create job record in database
      const job = await db.createJob({ title, location, skills, maxCandidates, enrichTopN });

      // Add job to queue
      await recruitmentQueue.add({
        jobId: job.id,
        title,
        location,
        skills,
        maxCandidates,
        enrichTopN,
      });

      logger.info('Job created', { jobId: job.id, title });

      res.status(201).json({
        jobId: job.id,
        status: job.status,
        message: 'Job created and queued for processing',
      });
    } catch (err) {
      logger.error('Failed to create job', { error: err.message });
      res.status(500).json({ error: 'Failed to create job', message: err.message });
    }
  }
);

// GET /api/jobs/:id - Get job status and progress
app.get(
  '/api/jobs/:id',
  [param('id').isUUID().withMessage('Invalid job ID')],
  validate,
  async (req, res) => {
    try {
      const job = await db.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        jobId: job.id,
        title: job.title,
        location: job.location,
        skills: job.skills,
        status: job.status,
        progress: job.progress,
        error: job.error,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        metadata: job.metadata,
      });
    } catch (err) {
      logger.error('Failed to get job', { jobId: req.params.id, error: err.message });
      res.status(500).json({ error: 'Failed to get job', message: err.message });
    }
  }
);

// GET /api/jobs/:id/results - Get job results (candidates)
app.get(
  '/api/jobs/:id/results',
  [
    param('id').isUUID().withMessage('Invalid job ID'),
  ],
  validate,
  async (req, res) => {
    try {
      const job = await db.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({
          error: 'Job not completed',
          status: job.status,
          progress: job.progress,
        });
      }

      const limit = parseInt(req.query.limit, 10) || 100;
      const candidates = await db.getCandidates(req.params.id, limit);

      res.json({
        jobId: job.id,
        total: candidates.length,
        candidates,
        metadata: job.metadata,
      });
    } catch (err) {
      logger.error('Failed to get results', { jobId: req.params.id, error: err.message });
      res.status(500).json({ error: 'Failed to get results', message: err.message });
    }
  }
);

// GET /api/jobs - List all jobs (with pagination)
app.get('/api/jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await db.query(
      'SELECT id, title, location, status, progress, created_at, completed_at FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      jobs: result.rows,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('Failed to list jobs', { error: err.message });
    res.status(500).json({ error: 'Failed to list jobs', message: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  await db.close();
  process.exit(0);
});
