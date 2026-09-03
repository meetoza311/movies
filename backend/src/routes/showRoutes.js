const express = require('express');
const { body } = require('express-validator');
const {
  listShows,
  getShow,
  createShow,
  updateShow,
  deleteShow,
} = require('../controllers/showController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { SHOW_STATUSES } = require('../models/Show');

const router = express.Router();

router.use(protect);

router.get('/', listShows);
router.get('/:id', getShow);

router.post(
  '/',
  [
    body('movieId').notEmpty().withMessage('movieId is required'),
    body('showDate').notEmpty().withMessage('showDate is required'),
    body('startTime').trim().notEmpty().withMessage('startTime is required'),
    body('endTime').trim().notEmpty().withMessage('endTime is required'),
    body('totalSeats').isInt({ min: 1 }).withMessage('totalSeats must be > 0'),
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

router.delete('/:id', deleteShow);

module.exports = router;
