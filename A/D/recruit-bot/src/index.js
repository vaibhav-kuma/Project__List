require('dotenv').config();
const TinyFishClient = require('./api/tinyfish');
const logger = require('./utils/logger');

async function main() {
  logger.info('RecruitBot starting — Phase 1 smoke test');

  const client = new TinyFishClient();

  // Smoke test: create a session, navigate to example.com, extract title, close
  let sessionId;
  try {
    const session = await client.createSession();
    sessionId = session.sessionId;

    await client.navigate(sessionId, 'https://example.com');

    const result = await client.extract(sessionId, {
      title: { selector: 'h1', type: 'text' },
    });

    logger.info('Smoke test passed', { title: result.title });

    const viewerUrl = await client.getSessionViewerUrl(sessionId);
    logger.info('Live session viewer', { viewerUrl });
  } finally {
    if (sessionId) await client.closeSession(sessionId);
  }
}

main().catch((err) => {
  logger.error('Fatal error', { error: err.message });
  process.exit(1);
});
