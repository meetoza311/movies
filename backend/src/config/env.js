const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load local .env if present (Render uses dashboard env vars instead)
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

function getMissingRequired() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  return required.filter((key) => !process.env[key]);
}

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminName: process.env.ADMIN_NAME || 'Administrator',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'change_me',
  getMissingRequired,
};
