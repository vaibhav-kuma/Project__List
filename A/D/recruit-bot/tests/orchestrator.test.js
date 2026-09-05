const CandidateScorer = require('../src/orchestrator/scorer');
const Deduplicator = require('../src/orchestrator/deduplicator');

// ─── CandidateScorer ──────────────────────────────────────────────────────────
describe('CandidateScorer', () => {
  const mockCandidate = {
    name: 'Alice Smith',
    location: 'San Francisco, CA',
    skills: ['JavaScript', 'Node.js', 'React', 'Python'],
    experience: [
      { title: 'Senior Engineer', company: 'Acme', duration: '3 yrs 2 mos' },
      { title: 'Engineer', company: 'StartupCo', duration: '2 yrs' },
    ],
  };

  test('scoreSkillMatch returns 40 when all required skills match', () => {
    const score = CandidateScorer.scoreSkillMatch(mockCandidate, ['JavaScript', 'React']);
    expect(score).toBe(40);
  });

  test('scoreSkillMatch returns 20 when half of required skills match', () => {
    const score = CandidateScorer.scoreSkillMatch(mockCandidate, ['JavaScript', 'Go', 'Rust', 'C++']);
    expect(score).toBe(10); // 1/4 match = 10 points
  });

  test('scoreSkillMatch returns 0 when no skills match', () => {
    const score = CandidateScorer.scoreSkillMatch(mockCandidate, ['Ruby', 'PHP']);
    expect(score).toBe(0);
  });

  test('scoreSkillMatch returns full points when no required skills', () => {
    const score = CandidateScorer.scoreSkillMatch(mockCandidate, []);
    expect(score).toBe(40);
  });

  test('scoreExperience returns 30 for 6+ years', () => {
    const score = CandidateScorer.scoreExperience({
      experience: [
        { duration: '4 yrs' },
        { duration: '3 yrs' },
      ],
    });
    expect(score).toBe(30);
  });

  test('scoreExperience returns 20 for 3-5 years', () => {
    const score = CandidateScorer.scoreExperience({
      experience: [{ duration: '4 yrs' }],
    });
    expect(score).toBe(20);
  });

  test('scoreExperience returns 10 for 1-2 years', () => {
    const score = CandidateScorer.scoreExperience({
      experience: [{ duration: '2 yrs' }],
    });
    expect(score).toBe(10);
  });

  test('scoreExperience returns 0 when no experience', () => {
    const score = CandidateScorer.scoreExperience({ experience: [] });
    expect(score).toBe(0);
  });

  test('scoreLocation returns 20 for exact match', () => {
    const score = CandidateScorer.scoreLocation(
      { location: 'San Francisco, CA' },
      'San Francisco, CA'
    );
    expect(score).toBe(20);
  });

  test('scoreLocation returns partial score for partial match', () => {
    const score = CandidateScorer.scoreLocation(
      { location: 'San Francisco Bay Area' },
      'San Francisco'
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(20);
  });

  test('scoreLocation returns 0 for no match', () => {
    const score = CandidateScorer.scoreLocation(
      { location: 'New York' },
      'San Francisco'
    );
    expect(score).toBe(0);
  });

  test('scoreLocation returns full points when no target location', () => {
    const score = CandidateScorer.scoreLocation({ location: 'Anywhere' }, null);
    expect(score).toBe(20);
  });

  test('scoreGitHub returns 10 for high activity', () => {
    const score = CandidateScorer.scoreGitHub({
      githubProfile: { repos: 30, stars: 200, contributions: 1000 },
    });
    expect(score).toBe(10);
  });

  test('scoreGitHub returns 0 when no GitHub profile', () => {
    const score = CandidateScorer.scoreGitHub({});
    expect(score).toBe(0);
  });

  test('score returns total score with breakdown', () => {
    const result = CandidateScorer.score(mockCandidate, {
      skills: ['JavaScript', 'React'],
      location: 'San Francisco',
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.scoreBreakdown).toHaveProperty('skillMatch');
    expect(result.scoreBreakdown).toHaveProperty('experience');
    expect(result.scoreBreakdown).toHaveProperty('location');
    expect(result.scoreBreakdown).toHaveProperty('github');
  });

  test('scoreAll sorts candidates by score descending', () => {
    const candidates = [
      { name: 'Low', skills: [], experience: [], location: '' },
      { name: 'High', skills: ['JavaScript', 'React'], experience: [{ duration: '5 yrs' }], location: 'San Francisco' },
      { name: 'Medium', skills: ['JavaScript'], experience: [{ duration: '2 yrs' }], location: 'San Francisco' },
    ];

    const scored = CandidateScorer.scoreAll(candidates, {
      skills: ['JavaScript', 'React'],
      location: 'San Francisco',
    });

    expect(scored[0].name).toBe('High');
    expect(scored[2].name).toBe('Low');
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
    expect(scored[1].score).toBeGreaterThan(scored[2].score);
  });
});

// ─── Deduplicator ─────────────────────────────────────────────────────────────
describe('Deduplicator', () => {
  test('getKey normalizes LinkedIn URLs', () => {
    const key1 = Deduplicator.getKey({ profileUrl: 'https://www.linkedin.com/in/alice/' });
    const key2 = Deduplicator.getKey({ profileUrl: 'https://www.linkedin.com/in/alice?trk=123' });
    expect(key1).toBe(key2);
  });

  test('getKey uses email when profileUrl is missing', () => {
    const key = Deduplicator.getKey({ email: 'Alice@Example.com' });
    expect(key).toBe('alice@example.com');
  });

  test('getKey falls back to name+location', () => {
    const key = Deduplicator.getKey({ name: 'Alice Smith', location: 'NYC' });
    expect(key).toBe('alice smith|nyc');
  });

  test('merge combines sources array', () => {
    const existing = { name: 'Alice', source: 'linkedin', skills: ['JavaScript'] };
    const incoming = { name: 'Alice', source: 'github', skills: ['Python'] };
    const merged = Deduplicator.merge(existing, incoming);

    expect(merged.sources).toEqual(['linkedin', 'github']);
    expect(merged.source).toBeUndefined();
  });

  test('merge prefers non-empty fields from incoming', () => {
    const existing = { name: 'Alice', about: '', skills: [] };
    const incoming = { name: 'Alice', about: 'Engineer', skills: ['JavaScript'], source: 'linkedin' };
    const merged = Deduplicator.merge(existing, incoming);

    expect(merged.about).toBe('Engineer');
    expect(merged.skills).toEqual(['JavaScript']);
  });

  test('merge concatenates arrays', () => {
    const existing = { name: 'Alice', skills: ['JavaScript'], source: 'linkedin' };
    const incoming = { name: 'Alice', skills: ['Python'], source: 'github' };
    const merged = Deduplicator.merge(existing, incoming);

    expect(merged.skills).toEqual(['JavaScript', 'Python']);
  });

  test('deduplicate removes duplicates by profileUrl', () => {
    const candidates = [
      { name: 'Alice', profileUrl: 'https://linkedin.com/in/alice', source: 'linkedin' },
      { name: 'Alice Smith', profileUrl: 'https://linkedin.com/in/alice/', source: 'github' },
      { name: 'Bob', profileUrl: 'https://linkedin.com/in/bob', source: 'linkedin' },
    ];

    const result = Deduplicator.deduplicate(candidates);
    expect(result).toHaveLength(2);
    expect(result[0].sources).toEqual(['linkedin', 'github']);
  });

  test('deduplicate preserves unique candidates', () => {
    const candidates = [
      { name: 'Alice', profileUrl: 'https://linkedin.com/in/alice', source: 'linkedin' },
      { name: 'Bob', profileUrl: 'https://linkedin.com/in/bob', source: 'linkedin' },
      { name: 'Charlie', profileUrl: 'https://linkedin.com/in/charlie', source: 'linkedin' },
    ];

    const result = Deduplicator.deduplicate(candidates);
    expect(result).toHaveLength(3);
  });
});

// ─── RecruitmentWorkflow (integration) ────────────────────────────────────────
jest.mock('../src/agents/linkedinAgent');
const RecruitmentWorkflow = require('../src/orchestrator/workflow');
const LinkedInAgent = require('../src/agents/linkedinAgent');

describe('RecruitmentWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('run returns scored and deduplicated candidates', async () => {
    const mockCandidates = [
      { name: 'Alice', profileUrl: 'https://linkedin.com/in/alice', skills: ['JavaScript'], experience: [{ duration: '3 yrs' }], location: 'SF', source: 'linkedin' },
      { name: 'Bob', profileUrl: 'https://linkedin.com/in/bob', skills: ['Python'], experience: [{ duration: '5 yrs' }], location: 'NYC', source: 'linkedin' },
    ];

    LinkedInAgent.prototype.run = jest.fn().mockResolvedValue({
      candidates: mockCandidates,
      viewerUrl: 'https://viewer.tinyfish.io/sess_test',
      durationSec: 120,
    });

    const workflow = new RecruitmentWorkflow();
    const result = await workflow.run({
      title: 'Engineer',
      location: 'SF',
      skills: ['JavaScript'],
      maxCandidates: 50,
      enrichTopN: 10,
    });

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].score).toBeDefined();
    expect(result.candidates[0].scoreBreakdown).toBeDefined();
    expect(result.metadata.total).toBe(2);
    expect(result.metadata.sources).toContain('linkedin');
  });

  test('run handles agent failures gracefully', async () => {
    LinkedInAgent.prototype.run = jest.fn().mockRejectedValue(new Error('Agent failed'));

    const workflow = new RecruitmentWorkflow();
    const result = await workflow.run({
      title: 'Engineer',
      location: 'SF',
      skills: ['JavaScript'],
    });

    // Should return empty results, not throw
    expect(result.candidates).toHaveLength(0);
    expect(result.metadata.total).toBe(0);
  });

  test('run deduplicates candidates from multiple sources', async () => {
    const duplicate = { name: 'Alice', profileUrl: 'https://linkedin.com/in/alice', skills: ['JavaScript'], source: 'linkedin' };

    LinkedInAgent.prototype.run = jest.fn().mockResolvedValue({
      candidates: [duplicate, duplicate, { name: 'Bob', profileUrl: 'https://linkedin.com/in/bob', skills: [], source: 'linkedin' }],
      viewerUrl: 'https://viewer.tinyfish.io/sess_test',
      durationSec: 120,
    });

    const workflow = new RecruitmentWorkflow();
    const result = await workflow.run({ title: 'Engineer', location: 'SF', skills: [] });

    expect(result.candidates).toHaveLength(2);
  });
});
