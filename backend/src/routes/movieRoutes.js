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
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listMovies);
router.get('/:id/dependencies', getMovieDependencies);
router.get('/:id', getMovie);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Movie name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
    body('description').optional().isString(),
    body('posterImage').optional().isString(),
  ],
  validate,
  createMovie
);

router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Movie name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }),
    body('description').optional().isString(),
    body('posterImage').optional().isString(),
  ],
  validate,
  updateMovie
);

router.delete('/:id', deleteMovie);

module.exports = router;
