const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  app.listen(env.port, () => {
    logger.info(`Savan Sentosa API listening on port ${env.port}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { message: err.message });
  process.exit(1);
});
