const env = require('../config/env');

const ts = () => new Date().toISOString();

const logger = {
  info: (message, meta) => {
    if (meta !== undefined) {
      console.log(`[${ts()}] INFO  ${message}`, meta);
    } else {
      console.log(`[${ts()}] INFO  ${message}`);
    }
  },
  warn: (message, meta) => {
    if (meta !== undefined) {
      console.warn(`[${ts()}] WARN  ${message}`, meta);
    } else {
      console.warn(`[${ts()}] WARN  ${message}`);
    }
  },
  error: (message, meta) => {
    if (meta !== undefined) {
      console.error(`[${ts()}] ERROR ${message}`, meta);
    } else {
      console.error(`[${ts()}] ERROR ${message}`);
    }
  },
  debug: (message, meta) => {
    if (env.nodeEnv === 'development') {
      if (meta !== undefined) {
        console.log(`[${ts()}] DEBUG ${message}`, meta);
      } else {
        console.log(`[${ts()}] DEBUG ${message}`);
      }
    }
  },
};

module.exports = logger;
