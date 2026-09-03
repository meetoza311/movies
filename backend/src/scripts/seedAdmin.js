require('../config/env');
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');
const env = require('../config/env');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

async function seedAdmin() {
  await connectDB();

  const email = env.adminEmail.toLowerCase().trim();
  const existing = await Admin.findOne({ email });

  if (existing) {
    logger.info(`Admin already exists: ${email}`);
  } else {
    const passwordHash = await Admin.hashPassword(env.adminPassword);
    await Admin.create({
      name: env.adminName,
      email,
      passwordHash,
      role: 'ADMIN',
    });
    logger.info(`Admin created: ${email}`);
  }

  await mongoose.connection.close();
}

seedAdmin().catch(async (err) => {
  logger.error('seed:admin failed', { message: err.message });
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
