-- Jobs table: tracks recruitment workflow jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  skills JSONB DEFAULT '[]',
  max_candidates INTEGER DEFAULT 50,
  enrich_top_n INTEGER DEFAULT 20,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Candidates table: stores extracted and scored candidates
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  headline TEXT,
  location VARCHAR(255),
  profile_url TEXT,
  image_url TEXT,
  email VARCHAR(255),
  about TEXT,
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  sources JSONB DEFAULT '[]',
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  github_profile JSONB,
  enriched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_profile_url ON candidates(profile_url);
