const express = require('express');
const { body } = require('express-validator');
const {
  listBookings,
  getBooking,
  createBookingHandler,
  updateBookingHandler,
  cancelBookingHandler,
  deleteBookingHandler,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listBookings);
router.get('/:id', getBooking);

router.post(
  '/',
  [
    body('showId').notEmpty().withMessage('showId is required'),
    body('customerName').trim().isLength({ min: 2, max: 100 }).withMessage('Valid customer name is required'),
    body('mobileNumber').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number is required'),
    body('seats').isArray({ min: 1 }).withMessage('At least one seat is required'),
  ],
  validate,
  createBookingHandler
);

router.put(
  '/:id',
  [
    body('customerName').optional().trim().isLength({ min: 2, max: 100 }),
    body('mobileNumber').optional().trim().matches(/^[6-9]\d{9}$/),
    body('seats').optional().isArray({ min: 1 }),
  ],
  validate,
  updateBookingHandler
);

router.patch('/:id/cancel', cancelBookingHandler);
router.delete('/:id', deleteBookingHandler);

module.exports = router;
