const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Admin = require('../models/Admin');
const { AppError, asyncHandler } = require('./errorMiddleware');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const decoded = jwt.verify(token, env.jwtSecret);
  const admin = await Admin.findById(decoded.id).select('-passwordHash');

  if (!admin) {
    throw new AppError('Admin account not found', 401, 'UNAUTHORIZED');
  }

  req.admin = admin;
  next();
});

module.exports = { protect };
