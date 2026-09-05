require('dotenv').config();
const LinkedInAgent = require('./agents/linkedinAgent');
const logger = require('./utils/logger');

async function main() {
  logger.info('=== Phase 2 Demo: LinkedIn Agent ===');

  const agent = new LinkedInAgent();

  const query = {
    title: 'Software Engineer',
    location: 'San Francisco Bay Area',
    keywords: ['JavaScript', 'Node.js'],
    maxCandidates: 50,
    enrichTopN: 10,
  };

  try {
    const result = await agent.run(query);

    logger.info('=== Results ===');
    logger.info(`Total candidates: ${result.candidates.length}`);
    logger.info(`Enriched profiles: ${result.candidates.filter((c) => c.enrichedAt).length}`);
    logger.info(`Duration: ${result.durationSec}s`);
    logger.info(`Live viewer: ${result.viewerUrl}`);

    // Show first 3 candidates
    logger.info('=== Sample Candidates ===');
    result.candidates.slice(0, 3).forEach((c, i) => {
      logger.info(`\n${i + 1}. ${c.name}`);
      logger.info(`   ${c.headline}`);
      logger.info(`   ${c.location}`);
      logger.info(`   ${c.profileUrl}`);
      if (c.skills) logger.info(`   Skills: ${c.skills.slice(0, 5).join(', ')}`);
    });

    logger.info('\n✅ Phase 2 complete — LinkedIn agent successfully extracted and enriched candidates');
  } catch (err) {
    logger.error('Demo failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();
