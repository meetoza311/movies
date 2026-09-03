const express = require('express');
const { body } = require('express-validator');
const {
  listTheaters,
  getTheater,
  createTheater,
  updateTheater,
  deleteTheater,
} = require('../controllers/theaterController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listTheaters);
router.get('/:id', getTheater);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Theater name is required'),
    body('rowCount').isInt({ min: 1, max: 20 }).withMessage('Rows must be between 1 and 20'),
    body('rowSeats').optional().isArray(),
  ],
  validate,
  createTheater
);

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Theater name cannot be empty'),
    body('rowCount').optional().isInt({ min: 1, max: 20 }),
    body('rowSeats').optional().isArray(),
  ],
  validate,
  updateTheater
);

router.delete('/:id', deleteTheater);

module.exports = router;
