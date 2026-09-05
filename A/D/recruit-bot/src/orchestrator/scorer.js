const logger = require('../utils/logger');

// Scoring weights (must sum to 100)
const WEIGHTS = {
  SKILL_MATCH: 40,
  EXPERIENCE: 30,
  LOCATION: 20,
  GITHUB: 10,
};

class CandidateScorer {
  // Calculate skill match score (0-40 points)
  static scoreSkillMatch(candidate, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return WEIGHTS.SKILL_MATCH;
    if (!candidate.skills || candidate.skills.length === 0) return 0;

    const candidateSkills = candidate.skills.map((s) => s.toLowerCase());
    const required = requiredSkills.map((s) => s.toLowerCase());

    let matches = 0;
    for (const skill of required) {
      if (candidateSkills.some((cs) => cs.includes(skill) || skill.includes(cs))) {
        matches++;
      }
    }

    const matchRatio = matches / required.length;
    return Math.round(matchRatio * WEIGHTS.SKILL_MATCH);
  }

  // Calculate experience level score (0-30 points)
  static scoreExperience(candidate) {
    if (!candidate.experience || candidate.experience.length === 0) return 0;

    // Count total years (rough heuristic from duration strings)
    let totalYears = 0;
    for (const exp of candidate.experience) {
      const duration = exp.duration || '';
      const yearMatch = duration.match(/(\d+)\s*yr/i);
      if (yearMatch) totalYears += parseInt(yearMatch[1], 10);
    }

    // Score bands: 0-2y=10pts, 3-5y=20pts, 6+=30pts
    if (totalYears >= 6) return WEIGHTS.EXPERIENCE;
    if (totalYears >= 3) return Math.round(WEIGHTS.EXPERIENCE * 0.67);
    if (totalYears >= 1) return Math.round(WEIGHTS.EXPERIENCE * 0.33);
    return 0;
  }

  // Calculate location match score (0-20 points)
  static scoreLocation(candidate, targetLocation) {
    if (!targetLocation) return WEIGHTS.LOCATION;
    if (!candidate.location) return 0;

    const candLoc = candidate.location.toLowerCase();
    const target = targetLocation.toLowerCase();

    // Exact match
    if (candLoc === target) return WEIGHTS.LOCATION;

    // Partial match (e.g., "San Francisco" in "San Francisco Bay Area")
    const targetTokens = target.split(/[\s,]+/);
    const matches = targetTokens.filter((t) => candLoc.includes(t));
    const matchRatio = matches.length / targetTokens.length;

    return Math.round(matchRatio * WEIGHTS.LOCATION);
  }

  // Calculate GitHub activity score (0-10 points)
  static scoreGitHub(candidate) {
    if (!candidate.githubProfile) return 0;

    const { repos = 0, stars = 0, contributions = 0 } = candidate.githubProfile;

    // Simple heuristic: repos + stars/10 + contributions/100
    const activity = repos + stars / 10 + contributions / 100;

    if (activity >= 50) return WEIGHTS.GITHUB;
    if (activity >= 20) return Math.round(WEIGHTS.GITHUB * 0.7);
    if (activity >= 5) return Math.round(WEIGHTS.GITHUB * 0.4);
    return 0;
  }

  // Main scoring function
  static score(candidate, criteria) {
    const { skills = [], location = null } = criteria;

    const skillScore = this.scoreSkillMatch(candidate, skills);
    const expScore = this.scoreExperience(candidate);
    const locScore = this.scoreLocation(candidate, location);
    const ghScore = this.scoreGitHub(candidate);

    const total = skillScore + expScore + locScore + ghScore;

    logger.debug('Scored candidate', {
      name: candidate.name,
      total,
      breakdown: { skill: skillScore, exp: expScore, loc: locScore, gh: ghScore },
    });

    return {
      ...candidate,
      score: total,
      scoreBreakdown: {
        skillMatch: skillScore,
        experience: expScore,
        location: locScore,
        github: ghScore,
      },
    };
  }

  // Score and sort an array of candidates
  static scoreAll(candidates, criteria) {
    const scored = candidates.map((c) => this.score(c, criteria));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}

module.exports = CandidateScorer;
