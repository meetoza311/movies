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

  // Start HTTP ASAP so Render health checks / wake pings succeed while Mongo connects
  const server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(`Savan Sentosa API listening on port ${env.port}`);
  });

  try {
    await connectDB();
  } catch (err) {
    logger.error('MongoDB connection failed', { message: err.message });
    server.close();
    throw err;
  }
}

start().catch((err) => {
  logger.error('Failed to start server', { message: err.message });
  console.error(err);
  process.exit(1);
});
