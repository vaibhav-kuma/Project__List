require('dotenv').config();
const RecruitmentWorkflow = require('./orchestrator/workflow');
const logger = require('./utils/logger');

async function main() {
  logger.info('=== Phase 3 Demo: Recruitment Workflow Orchestrator ===');

  const workflow = new RecruitmentWorkflow();

  const jobRequest = {
    title: 'Senior Software Engineer',
    location: 'San Francisco Bay Area',
    skills: ['JavaScript', 'Node.js', 'React', 'TypeScript'],
    maxCandidates: 50,
    enrichTopN: 20,
  };

  try {
    const result = await workflow.run(jobRequest);

    logger.info('=== Workflow Results ===');
    logger.info(`Total candidates: ${result.metadata.total}`);
    logger.info(`Enriched profiles: ${result.metadata.enriched}`);
    logger.info(`Sources: ${result.metadata.sources.join(', ')}`);
    logger.info(`Duration: ${result.metadata.durationSec}s`);
    logger.info(`Live viewers: ${result.metadata.viewerUrls.join(', ')}`);

    // Show top 5 scored candidates
    logger.info('\n=== Top 5 Candidates (Ranked by Score) ===');
    result.candidates.slice(0, 5).forEach((c, i) => {
      logger.info(`\n${i + 1}. ${c.name} — Score: ${c.score}/100`);
      logger.info(`   ${c.headline}`);
      logger.info(`   ${c.location}`);
      logger.info(`   ${c.profileUrl}`);
      logger.info(`   Score breakdown:`);
      logger.info(`     • Skill match: ${c.scoreBreakdown.skillMatch}/40`);
      logger.info(`     • Experience: ${c.scoreBreakdown.experience}/30`);
      logger.info(`     • Location: ${c.scoreBreakdown.location}/20`);
      logger.info(`     • GitHub: ${c.scoreBreakdown.github}/10`);
      if (c.skills) logger.info(`   Skills: ${c.skills.slice(0, 8).join(', ')}`);
      if (c.sources) logger.info(`   Sources: ${c.sources.join(', ')}`);
    });

    // Calculate ROI
    const manualTimePerCandidate = 15; // minutes
    const timeSavedMinutes = result.metadata.total * manualTimePerCandidate;
    const timeSavedHours = (timeSavedMinutes / 60).toFixed(1);
    const costPerHour = 50; // recruiter hourly rate
    const costSaved = (timeSavedHours * costPerHour).toFixed(0);

    logger.info('\n=== ROI Calculation ===');
    logger.info(`Manual time per candidate: ${manualTimePerCandidate} minutes`);
    logger.info(`Total time saved: ${timeSavedHours} hours`);
    logger.info(`Cost saved (at $${costPerHour}/hr): $${costSaved}`);
    logger.info(`Agent runtime: ${result.metadata.durationSec}s (${(result.metadata.durationSec / 60).toFixed(1)} minutes)`);
    logger.info(`Speed improvement: ${(timeSavedMinutes / (result.metadata.durationSec / 60)).toFixed(0)}x faster`);

    logger.info('\n✅ Phase 3 complete — Workflow orchestrator successfully scored and ranked candidates');
  } catch (err) {
    logger.error('Demo failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();
