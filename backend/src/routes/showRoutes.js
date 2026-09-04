const express = require('express');
const { body } = require('express-validator');
const {
  listShows,
  getShow,
  createShow,
  updateShow,
  deleteShow,
} = require('../controllers/showController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { SHOW_STATUSES } = require('../models/Show');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get(
  '/',
  authorize(ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.BOOKING, ROLES.SCANNER),
  listShows
);
router.get(
  '/:id',
  authorize(ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.BOOKING, ROLES.SCANNER),
  getShow
);

router.post(
  '/',
  authorize(ROLES.SUPERADMIN, ROLES.ADMIN),
  [
    body('movieId').notEmpty().withMessage('movieId is required'),
    body('showDate').notEmpty().withMessage('showDate is required'),
    body('startTime').trim().notEmpty().withMessage('startTime is required'),
    body('endTime').trim().notEmpty().withMessage('endTime is required'),
    body('theaterId').notEmpty().withMessage('Select a theater screen'),
    body('seatPrice').optional().isFloat({ min: 0 }),
    body('guestPrice').optional().isFloat({ min: 0 }),
    body('ownerPrice').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(SHOW_STATUSES),
  ],
  validate,
  createShow
);

router.put(
  '/:id',
  authorize(ROLES.SUPERADMIN, ROLES.ADMIN),
  [
    body('startTime').optional().trim().notEmpty(),
    body('endTime').optional().trim().notEmpty(),
    body('seatPrice').optional().isFloat({ min: 0 }),
    body('guestPrice').optional().isFloat({ min: 0 }),
    body('ownerPrice').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(SHOW_STATUSES),
  ],
  validate,
  updateShow
);

router.delete('/:id', authorize(ROLES.SUPERADMIN, ROLES.ADMIN), deleteShow);

module.exports = router;
