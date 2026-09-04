const express = require('express');
const { body } = require('express-validator');
const {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  resetData,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { ROLES, ASSIGNABLE_ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.SUPERADMIN, ROLES.ADMIN));

router.get('/', listUsers);
router.post('/reset-data', resetData);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(ASSIGNABLE_ROLES)
      .withMessage(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`),
  ],
  validate,
  createUser
);

router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('email').optional().isEmail(),
    body('role').optional().isIn(ASSIGNABLE_ROLES),
  ],
  validate,
  updateUser
);

router.patch(
  '/:id/password',
  [
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  resetPassword
);

router.delete('/:id', deleteUser);

module.exports = router;
