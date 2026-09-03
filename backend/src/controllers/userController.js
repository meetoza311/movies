const Admin = require('../models/Admin');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

const listUsers = asyncHandler(async (_req, res) => {
  const users = await Admin.find()
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

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2) {
      throw new AppError('Name must be at least 2 characters', 400, 'VALIDATION_ERROR');
    }
    user.name = name;
  }

  if (req.body.email !== undefined) {
    const email = String(req.body.email).toLowerCase().trim();
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

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
};
