const LinkedInAgent = require('../agents/linkedinAgent');
const Deduplicator = require('./deduplicator');
const CandidateScorer = require('./scorer');
const logger = require('../utils/logger');

class RecruitmentWorkflow {
  constructor() {
    this.linkedInAgent = new LinkedInAgent();
    // Future: this.indeedAgent, this.githubAgent
  }

  // Main entry point
  // request: { title, location, skills[], maxCandidates, enrichTopN }
  async run(request) {
    const {
      title,
      location,
      skills = [],
      maxCandidates = 50,
      enrichTopN = 20,
    } = request;

    logger.info('Recruitment workflow starting', { title, location, skills, maxCandidates });
    const startTime = Date.now();

    // Step 1: Run agents in parallel (currently only LinkedIn)
    const agentResults = await this._runAgents({ title, location, skills, maxCandidates, enrichTopN });

    // Step 2: Flatten all candidates from all sources
    const allCandidates = agentResults.flatMap((r) => r.candidates);
    logger.info(`Collected ${allCandidates.length} candidates from ${agentResults.length} source(s)`);

    // Step 3: Deduplicate
    const deduplicated = Deduplicator.deduplicate(allCandidates);

    // Step 4: Score all candidates
    const scored = CandidateScorer.scoreAll(deduplicated, { skills, location });

    // Step 5: Enrich top N (if not already enriched)
    const topCandidates = scored.slice(0, enrichTopN);
    const enriched = await this._enrichTopCandidates(topCandidates);

    // Merge enriched back into scored list
    const enrichedUrls = new Set(enriched.map((c) => Deduplicator.getKey(c)));
    const remaining = scored.filter((c) => !enrichedUrls.has(Deduplicator.getKey(c)));
    const finalResults = [...enriched, ...remaining];

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('Recruitment workflow complete', {
      total: finalResults.length,
      enriched: enriched.length,
      durationSec: duration,
    });

    return {
      candidates: finalResults,
      metadata: {
        total: finalResults.length,
        enriched: enriched.length,
        sources: agentResults.map((r) => r.source),
        durationSec: parseFloat(duration),
        viewerUrls: agentResults.map((r) => r.viewerUrl).filter(Boolean),
      },
    };
  }

  // Run all agents in parallel
  async _runAgents(query) {
    const promises = [];

    // LinkedIn agent
    promises.push(
      this.linkedInAgent
        .run(query)
        .then((result) => ({
          source: 'linkedin',
          candidates: result.candidates,
          viewerUrl: result.viewerUrl,
        }))
        .catch((err) => {
          logger.error('LinkedIn agent failed', { error: err.message });
          return { source: 'linkedin', candidates: [], viewerUrl: null };
        })
    );

    // Future: Indeed, GitHub agents
    // promises.push(this.indeedAgent.run(query).then(...).catch(...));
    // promises.push(this.githubAgent.run(query).then(...).catch(...));

    return Promise.all(promises);
  }

  // Enrich top candidates if they don't already have enrichment data
  async _enrichTopCandidates(candidates) {
    const toEnrich = candidates.filter((c) => !c.enrichedAt);

    if (toEnrich.length === 0) {
      logger.info('All top candidates already enriched');
      return candidates;
    }

    logger.info(`Enriching ${toEnrich.length} top candidates`);

    // For now, if they came from LinkedIn and aren't enriched, we skip re-enrichment
    // (the LinkedIn agent already enriched the top N during its run)
    // In a real system, we'd have a separate enrichment service here

    return candidates;
  }
}

module.exports = RecruitmentWorkflow;
