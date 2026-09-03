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
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listUsers);
router.post('/reset-data', resetData);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  createUser
);

router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('email').optional().isEmail(),
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
