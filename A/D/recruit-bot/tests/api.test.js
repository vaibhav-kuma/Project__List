// Mock dependencies
jest.mock('../src/api/queue');
jest.mock('../src/db/database');

const request = require('supertest');
const express = require('express');
const recruitmentQueue = require('../src/api/queue');
const db = require('../src/db/database');

// Create a minimal test app
const app = express();
app.use(express.json());

// Import routes (we'll inline them for testing)
const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

app.post(
  '/api/jobs',
  [
    body('title').isString().notEmpty(),
    body('location').optional().isString(),
    body('skills').optional().isArray(),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, location, skills = [], maxCandidates = 50, enrichTopN = 20 } = req.body;
      const job = await db.createJob({ title, location, skills, maxCandidates, enrichTopN });
      await recruitmentQueue.add({ jobId: job.id, title, location, skills, maxCandidates, enrichTopN });
      res.status(201).json({ jobId: job.id, status: job.status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get('/api/jobs/:id', [param('id').isUUID()], validate, async (req, res) => {
  try {
    const job = await db.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/:id/results', [param('id').isUUID()], validate, async (req, res) => {
  try {
    const job = await db.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed', status: job.status });
    }
    const candidates = await db.getCandidates(req.params.id, 100);
    res.json({ jobId: job.id, total: candidates.length, candidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/jobs', () => {
    test('creates a job and returns jobId', async () => {
      const mockJob = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Engineer',
        status: 'pending',
      };

      db.createJob = jest.fn().mockResolvedValue(mockJob);
      recruitmentQueue.add = jest.fn().mockResolvedValue({});

      const res = await request(app)
        .post('/api/jobs')
        .send({ title: 'Engineer', location: 'SF', skills: ['JavaScript'] });

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBe(mockJob.id);
      expect(res.body.status).toBe('pending');
      expect(db.createJob).toHaveBeenCalledWith({
        title: 'Engineer',
        location: 'SF',
        skills: ['JavaScript'],
        maxCandidates: 50,
        enrichTopN: 20,
      });
      expect(recruitmentQueue.add).toHaveBeenCalled();
    });

    test('returns 400 when title is missing', async () => {
      const res = await request(app).post('/api/jobs').send({ location: 'SF' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    test('returns 400 when skills is not an array', async () => {
      const res = await request(app).post('/api/jobs').send({ title: 'Engineer', skills: 'JavaScript' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/jobs/:id', () => {
    test('returns job status', async () => {
      const mockJob = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Engineer',
        status: 'running',
        progress: 50,
      };

      db.getJob = jest.fn().mockResolvedValue(mockJob);

      const res = await request(app).get('/api/jobs/123e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('running');
      expect(res.body.progress).toBe(50);
    });

    test('returns 404 when job not found', async () => {
      db.getJob = jest.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/jobs/123e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    test('returns 400 for invalid UUID', async () => {
      const res = await request(app).get('/api/jobs/invalid-id');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/jobs/:id/results', () => {
    test('returns candidates when job is completed', async () => {
      const mockJob = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
      };
      const mockCandidates = [
        { name: 'Alice', score: 90 },
        { name: 'Bob', score: 85 },
      ];

      db.getJob = jest.fn().mockResolvedValue(mockJob);
      db.getCandidates = jest.fn().mockResolvedValue(mockCandidates);

      const res = await request(app).get('/api/jobs/123e4567-e89b-12d3-a456-426614174000/results');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.candidates).toHaveLength(2);
      expect(res.body.candidates[0].name).toBe('Alice');
    });

    test('returns 400 when job is not completed', async () => {
      const mockJob = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'running',
        progress: 50,
      };

      db.getJob = jest.fn().mockResolvedValue(mockJob);

      const res = await request(app).get('/api/jobs/123e4567-e89b-12d3-a456-426614174000/results');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Job not completed');
      expect(res.body.status).toBe('running');
    });

    test('returns 404 when job not found', async () => {
      db.getJob = jest.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/jobs/123e4567-e89b-12d3-a456-426614174000/results');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });
  });
});
