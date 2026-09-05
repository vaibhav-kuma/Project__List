const Queue = require('bull');
const logger = require('../utils/logger');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create the recruitment job queue
const recruitmentQueue = new Queue('recruitment', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // keep last 100 completed jobs
    removeOnFail: 200,     // keep last 200 failed jobs
  },
});

// Event listeners for monitoring
recruitmentQueue.on('error', (err) => {
  logger.error('Queue error', { error: err.message });
});

recruitmentQueue.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job.id, error: err.message });
});

recruitmentQueue.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id });
});

recruitmentQueue.on('active', (job) => {
  logger.info('Job started', { jobId: job.id });
});

module.exports = recruitmentQueue;
