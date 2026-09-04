require('../config/env');
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');
const env = require('../config/env');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Ensures the single SUPERADMIN from .env exists.
 * Never create SUPERADMIN from the Users UI — only via this script / DB.
 *
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
    existing.role = ROLES.SUPERADMIN;
    await existing.save();
    logger.info(`Superadmin updated from env: ${email}`);
  } else {
    await Admin.create({
      name: env.adminName,
      email,
      passwordHash,
      role: ROLES.SUPERADMIN,
    });
    logger.info(`Superadmin created: ${email}`);
  }

  // Demote any other accidental SUPERADMIN accounts (keep only env email)
  const demoted = await Admin.updateMany(
    { role: ROLES.SUPERADMIN, email: { $ne: email } },
    { $set: { role: ROLES.ADMIN } }
  );
  if (demoted.modifiedCount) {
    logger.info(`Demoted ${demoted.modifiedCount} extra SUPERADMIN account(s) to ADMIN`);
  }

  await mongoose.connection.close();
}

seedAdmin().catch(async (err) => {
  logger.error('seed:admin failed', { message: err.message });
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
