const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const env = require('../config/env');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

function signToken(adminId) {
  return jwt.sign({ id: adminId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  const admin = await Admin.findOne({ email }).select('+passwordHash');
  if (!admin || !(await admin.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = signToken(admin._id);
  logger.info('Admin login', { email: admin.email });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
  });
});

const logout = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Admin profile',
    data: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || !newPassword) {
    throw new AppError(
      'Current password and new password are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  if (!admin || !(await admin.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  admin.passwordHash = await Admin.hashPassword(newPassword);
  await admin.save();

  logger.info('Admin password changed', { email: admin.email });

  res.json({
    success: true,
    message: 'Password updated successfully',
    data: null,
  });
});

module.exports = { login, logout, me, changePassword };
