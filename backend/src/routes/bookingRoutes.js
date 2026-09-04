const express = require('express');
const { body } = require('express-validator');
const {
  listBookings,
  getBooking,
  createBookingHandler,
  updateBookingHandler,
  cancelBookingHandler,
  deleteBookingHandler,
  lookupTicketHandler,
  checkInTicketHandler,
  listShowGateHandler,
  sendBookingEmailHandler,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listBookings);

// Gate / scanner routes (before /:id)
router.get('/gate/show/:showId', listShowGateHandler);
router.post(
  '/gate/lookup',
  [body('code').trim().notEmpty().withMessage('Ticket code is required')],
  validate,
  lookupTicketHandler
);
router.post(
  '/gate/check-in',
  [
    body('code').trim().notEmpty().withMessage('Ticket code is required'),
    body('showId').notEmpty().withMessage('showId is required'),
    body('method').optional().isIn(['SCAN', 'MANUAL']),
  ],
  validate,
  checkInTicketHandler
);

router.post('/:id/send-email', sendBookingEmailHandler);

router.get('/:id', getBooking);

router.post(
  '/',
  [
    body('showId').notEmpty().withMessage('showId is required'),
    body('customerName').trim().isLength({ min: 2, max: 100 }).withMessage('Valid customer name is required'),
    body('mobileNumber').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number is required'),
    body('customerEmail').trim().isEmail().withMessage('Valid customer email is required'),
    body('blockNo').optional().trim().isLength({ max: 80 }),
    body('notes').optional().trim().isLength({ max: 500 }),
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
    body('customerEmail').optional().trim().isEmail().withMessage('Valid customer email is required'),
    body('blockNo').optional().trim().isLength({ max: 80 }),
    body('notes').optional().trim().isLength({ max: 500 }),
    body('seats').optional().isArray({ min: 1 }),
  ],
  validate,
  updateBookingHandler
);

router.patch('/:id/cancel', cancelBookingHandler);
router.delete('/:id', deleteBookingHandler);

module.exports = router;
