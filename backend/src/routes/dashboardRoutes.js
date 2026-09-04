const express = require('express');
const { getStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.use(authorize(ROLES.SUPERADMIN, ROLES.ADMIN));
router.get('/stats', getStats);

module.exports = router;
