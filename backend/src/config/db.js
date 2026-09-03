const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const connectDB = async (uri = env.mongodbUri) => {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

module.exports = { connectDB };
