type JobHandler<T = any> = (data: T) => Promise<void>;

interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  scheduledAt: number;
}

export class JobQueue {
  private handlers: Map<string, JobHandler> = new Map();
  private queue: Job[] = [];
  private processing: boolean = false;
  private concurrency: number;
  private activeJobs: number = 0;
  private paused: boolean = false;

  constructor(concurrency: number = 4) {
    this.concurrency = concurrency;
    this.processQueue = this.processQueue.bind(this);
  }

  register<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  async enqueue<T>(
    type: string,
    data: T,
    options: { priority?: number; delay?: number; maxAttempts?: number } = {}
  ): Promise<string> {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const job: Job<T> = {
      id,
      type,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: Date.now(),
      scheduledAt: Date.now() + (options.delay || 0),
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);

    if (!this.processing && !this.paused) {
      this.processQueue();
    }

    return id;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.paused) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs < this.concurrency && !this.paused) {
      const now = Date.now();
      const readyIndex = this.queue.findIndex((job) => job.scheduledAt <= now);

      if (readyIndex === -1) {
        const nextScheduled = Math.min(...this.queue.map((j) => j.scheduledAt));
        const waitTime = nextScheduled - Date.now();
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        break;
      }

      const job = this.queue.splice(readyIndex, 1)[0];
      this.activeJobs++;

      this.executeJob(job).finally(() => {
        this.activeJobs--;
        this.processQueue();
      });
    }

    this.processing = false;
  }

  private async executeJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.warn(`[JobQueue] No handler for job type: ${job.type}`, job.id);
      return;
    }

    try {
      await handler(job.data);
    } catch (error: any) {
      job.attempts++;
      if (job.attempts < job.maxAttempts) {
        const backoff = Math.pow(2, job.attempts) * 1000;
        job.scheduledAt = Date.now() + backoff;
        this.queue.push(job);
        this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
        if (!this.processing) {
          this.processQueue();
        }
      } else {
        console.error(`[JobQueue] Job failed after ${job.attempts} attempts:`, job.type, job.id, error.message);
      }
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (!this.processing) {
      this.processQueue();
    }
  }

  getStats() {
    return {
      queued: this.queue.length,
      active: this.activeJobs,
      handlers: this.handlers.size,
      paused: this.paused,
    };
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

let jobQueueInstance: JobQueue | null = null;

export function getJobQueue(concurrency?: number): JobQueue {
  if (!jobQueueInstance) {
    jobQueueInstance = new JobQueue(concurrency);
  }
  return jobQueueInstance;
}

export async function scheduleEmailJob(to: string, subject: string, body: string, delay?: number): Promise<string> {
  const queue = getJobQueue();
  return queue.enqueue('send-email', { to, subject, body }, { delay });
}

export async function scheduleModerationJob(userId: string, sessionId: string, delay?: number): Promise<string> {
  const queue = getJobQueue();
  return queue.enqueue('run-moderation', { userId, sessionId }, { delay, priority: 1 });
}

export async function scheduleDataExportJob(userId: string, exportId: string): Promise<string> {
  const queue = getJobQueue();
  return queue.enqueue('export-data', { userId, exportId }, { priority: 0 });
}

export async function scheduleCleanupJob(): Promise<string> {
  const queue = getJobQueue();
  return queue.enqueue('cleanup-expired', {}, { delay: 60000, priority: -1 });
}
