require('../config/env');
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');
const env = require('../config/env');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Creates admin if missing, or updates name/password from .env.
 * Change password easily: update ADMIN_PASSWORD in .env (or Render), then run:
 *   npm run seed:admin
 */
async function seedAdmin() {
  await connectDB();

  const email = env.adminEmail.toLowerCase().trim();
  const passwordHash = await Admin.hashPassword(env.adminPassword);

  const existing = await Admin.findOne({ email }).select('+passwordHash');

  if (existing) {
    existing.name = env.adminName;
    existing.passwordHash = passwordHash;
    await existing.save();
    logger.info(`Admin updated from env: ${email}`);
  } else {
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
