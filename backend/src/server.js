const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

async function start() {
  if (env.nodeEnv !== 'test') {
    const missing = env.getMissingRequired();
    if (missing.length) {
      console.error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
      console.error(
        'On Render: Dashboard → your service → Environment → add MONGODB_URI and JWT_SECRET, then redeploy.'
      );
      process.exit(1);
    }
  }

  await connectDB();

  // Bind 0.0.0.0 so Render can reach the service
  app.listen(env.port, '0.0.0.0', () => {
    logger.info(`Savan Sentosa API listening on port ${env.port}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { message: err.message });
  console.error(err);
  process.exit(1);
});
