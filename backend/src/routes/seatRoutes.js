const express = require('express');
const { getShowSeats } = require('../controllers/seatController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router({ mergeParams: true });

router.use(protect);
router.get(
  '/:showId/seats',
  authorize(ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.BOOKING, ROLES.SCANNER),
  getShowSeats
);

module.exports = router;
