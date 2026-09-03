const express = require('express');
const { getShowSeats } = require('../controllers/seatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(protect);
router.get('/:showId/seats', getShowSeats);

module.exports = router;
