const express = require('express');
const { body } = require('express-validator');
const {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  getMovieDependencies,
} = require('../controllers/movieController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

const managers = authorize(ROLES.SUPERADMIN, ROLES.ADMIN);
const managersAndBooking = authorize(ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.BOOKING);

router.get('/', managersAndBooking, listMovies);
router.get('/:id/dependencies', managers, getMovieDependencies);
router.get('/:id', managersAndBooking, getMovie);

router.post(
  '/',
  managers,
  [
    body('title').trim().notEmpty().withMessage('Movie name is required'),
    body('description').optional().isString(),
    body('posterImage').optional().isString(),
  ],
  validate,
  createMovie
);

router.put(
  '/:id',
  managers,
  [
    body('title').optional().trim().notEmpty().withMessage('Movie name cannot be empty'),
    body('description').optional().isString(),
    body('posterImage').optional().isString(),
  ],
  validate,
  updateMovie
);

router.delete('/:id', managers, deleteMovie);

module.exports = router;
