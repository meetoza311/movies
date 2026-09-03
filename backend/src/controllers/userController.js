const Admin = require('../models/Admin');
const env = require('../config/env');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  resetCatalogData,
  MAX_MOVIES,
  MAX_SHOWS,
  MAX_THEATERS,
} = require('../services/movieCleanupService');
const logger = require('../utils/logger');

function getSuperAdminEmail() {
  return String(env.adminEmail || 'admin@example.com').toLowerCase().trim();
}

function isSuperAdminEmail(email) {
  return String(email || '').toLowerCase().trim() === getSuperAdminEmail();
}

function assertNotSuperAdmin(user) {
  if (user && isSuperAdminEmail(user.email)) {
    throw new AppError(
      'Super admin account cannot be managed from Users',
      403,
      'SUPER_ADMIN_PROTECTED'
    );
  }
}

const listUsers = asyncHandler(async (_req, res) => {
  const users = await Admin.find({
    email: { $ne: getSuperAdminEmail() },
  })
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    message: 'Users fetched',
    data: users,
  });
});

const createUser = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!name || name.length < 2) {
    throw new AppError('Name must be at least 2 characters', 400, 'VALIDATION_ERROR');
  }
  if (!email) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }
  if (isSuperAdminEmail(email)) {
    throw new AppError('This email is reserved for super admin', 403, 'SUPER_ADMIN_PROTECTED');
  }
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  const exists = await Admin.findOne({ email });
  if (exists) {
    throw new AppError('A user with this email already exists', 409, 'DUPLICATE_EMAIL');
  }

  const passwordHash = await Admin.hashPassword(password);
  const user = await Admin.create({
    name,
    email,
    passwordHash,
    role: 'ADMIN',
  });

  logger.info('User created', { email: user.email, by: req.admin.email });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await Admin.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  assertNotSuperAdmin(user);

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2) {
      throw new AppError('Name must be at least 2 characters', 400, 'VALIDATION_ERROR');
    }
    user.name = name;
  }

  if (req.body.email !== undefined) {
    const email = String(req.body.email).toLowerCase().trim();
    if (isSuperAdminEmail(email)) {
      throw new AppError('This email is reserved for super admin', 403, 'SUPER_ADMIN_PROTECTED');
    }
    const duplicate = await Admin.findOne({ email, _id: { $ne: user._id } });
    if (duplicate) {
      throw new AppError('A user with this email already exists', 409, 'DUPLICATE_EMAIL');
    }
    user.email = email;
  }

  await user.save();
  logger.info('User updated', { email: user.email, by: req.admin.email });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await Admin.findById(req.params.id).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  assertNotSuperAdmin(user);

  const newPassword = String(req.body.newPassword || '');
  if (newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  user.passwordHash = await Admin.hashPassword(newPassword);
  await user.save();

  logger.info('User password reset', { email: user.email, by: req.admin.email });

  res.json({
    success: true,
    message: 'Password updated successfully',
    data: null,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await Admin.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  assertNotSuperAdmin(user);

  if (String(user._id) === String(req.admin._id)) {
    throw new AppError('You cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }

  const total = await Admin.countDocuments();
  if (total <= 1) {
    throw new AppError('Cannot delete the last admin user', 400, 'LAST_ADMIN');
  }

  await user.deleteOne();
  logger.info('User deleted', { email: user.email, by: req.admin.email });

  res.json({
    success: true,
    message: 'User deleted successfully',
    data: null,
  });
});

const resetData = asyncHandler(async (req, res) => {
  const summary = await resetCatalogData();
  logger.info('Catalog reset requested', {
    by: req.admin?.email,
    summary,
  });

  res.json({
    success: true,
    message: `Data trimmed to latest ${MAX_MOVIES} movies, ${MAX_THEATERS} screens, and ${MAX_SHOWS} shows`,
    data: summary,
  });
});

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  resetData,
};
