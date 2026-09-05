require('dotenv').config();
const recruitmentQueue = require('./api/queue');
const RecruitmentWorkflow = require('./orchestrator/workflow');
const db = require('./db/database');
const logger = require('./utils/logger');

// Process jobs from the queue
recruitmentQueue.process(async (job) => {
  const { jobId, title, location, skills, maxCandidates, enrichTopN } = job.data;

  logger.info('Processing recruitment job', { jobId, title, location });

  try {
    // Update status to running
    await db.updateJobStatus(jobId, 'running', { progress: 0 });

    // Run the workflow
    const workflow = new RecruitmentWorkflow();
    const result = await workflow.run({
      title,
      location,
      skills,
      maxCandidates,
      enrichTopN,
    });

    // Save candidates to database
    await db.saveCandidates(jobId, result.candidates);

    // Update job status to completed
    await db.updateJobStatus(jobId, 'completed', {
      progress: 100,
      metadata: result.metadata,
    });

    logger.info('Job completed successfully', { jobId, total: result.metadata.total });

    return { success: true, candidatesFound: result.metadata.total };
  } catch (err) {
    logger.error('Job processing failed', { jobId, error: err.message, stack: err.stack });

    // Update job status to failed
    await db.updateJobStatus(jobId, 'failed', {
      error: err.message,
    });

    throw err; // Bull will retry based on attempts config
  }
});

logger.info('Worker started, waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await recruitmentQueue.close();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await recruitmentQueue.close();
  await db.close();
  process.exit(0);
});
