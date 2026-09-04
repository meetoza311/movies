const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Admin = require('../models/Admin');
const { AppError, asyncHandler } = require('./errorMiddleware');
const { normalizeRole } = require('../constants/roles');

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

/**
 * Require one of the allowed roles. Use after `protect`.
 */
function authorize(...roles) {
  const allowed = roles.map((r) => normalizeRole(r));
  return (req, _res, next) => {
    const role = normalizeRole(req.admin?.role);
    if (!allowed.includes(role)) {
      return next(
        new AppError('You do not have permission for this action', 403, 'FORBIDDEN')
      );
    }
    return next();
  };
}

module.exports = { protect, authorize };
