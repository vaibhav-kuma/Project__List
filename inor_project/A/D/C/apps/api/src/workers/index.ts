import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';

const redisUrl = config.redis.url || 'redis://localhost:6379';
const redis = new Redis(redisUrl);
const connection = { host: 'localhost', port: 6379 };

// Extract host and port from Redis URL for BullMQ
const connectionOpts = (() => {
  try {
    const url = new URL(redisUrl);
    return { host: url.hostname || 'localhost', port: parseInt(url.port || '6379') };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
})();

// Video processing queues
export const videoProcessingQueue = new Queue('video-processing', { connection: connectionOpts });
export const thumbnailGenerationQueue = new Queue('thumbnail-generation', { connection: connectionOpts });
export const emailQueue = new Queue('email', { connection: connectionOpts });

// Video processing worker
export const videoProcessingWorker = new Worker(
  'video-processing',
  async (job: Job) => {
    const { videoId, inputPath, outputDir } = job.data;
    console.log(`Processing video ${videoId} (job ${job.id})`);

    await job.updateProgress(10);
    await job.updateProgress({ status: 'ANALYZING', videoId });

    // In production, use FFmpeg to transcode
    const qualities = [
      { name: '360p', width: 640, height: 360, bitrate: '800k' },
      { name: '480p', width: 854, height: 480, bitrate: '1500k' },
      { name: '720p', width: 1280, height: 720, bitrate: '3000k' },
      { name: '1080p', width: 1920, height: 1080, bitrate: '6000k' },
    ];

    for (let i = 0; i < qualities.length; i++) {
      const q = qualities[i];
      await job.updateProgress(Math.round(((i + 1) / qualities.length) * 80) + 10);
      console.log(`Transcoding to ${q.name}...`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Generate master playlist
    await job.updateProgress(95);
    console.log(`Generating master playlist for ${videoId}`);

    await job.updateProgress(100);
    return { success: true, videoId, qualities: qualities.map((q) => q.name) };
  },
  {
    connection: connectionOpts,
    concurrency: 2,
    limiter: { max: 4, duration: 1000 },
  },
);

// Thumbnail generation worker
export const thumbnailWorker = new Worker(
  'thumbnail-generation',
  async (job: Job) => {
    const { videoId, inputPath } = job.data;
    console.log(`Generating thumbnails for ${videoId}`);

    await job.updateProgress(25);
    await new Promise((r) => setTimeout(r, 500));
    await job.updateProgress(50);
    await new Promise((r) => setTimeout(r, 500));
    await job.updateProgress(75);
    await new Promise((r) => setTimeout(r, 500));

    await job.updateProgress(100);
    return { success: true, videoId, thumbnails: ['default.jpg', 'mq.jpg', 'hq.jpg', 'maxres.jpg'] };
  },
  { connection: connectionOpts },
);

// Email worker
export const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    const { to, subject, body } = job.data;
    console.log(`Sending email to ${to}: ${subject}`);
    return { success: true };
  },
  { connection: connectionOpts },
);

videoProcessingWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

videoProcessingWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

export async function addVideoProcessingJob(videoId: string, inputPath: string) {
  return videoProcessingQueue.add('transcode', {
    videoId,
    inputPath,
    outputDir: `/output/${videoId}`,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function addThumbnailJob(videoId: string, inputPath: string) {
  return thumbnailGenerationQueue.add('generate-thumbnails', {
    videoId,
    inputPath,
  });
}

export async function addEmailJob(to: string, subject: string, body: string) {
  return emailQueue.add('send-email', { to, subject, body });
}
