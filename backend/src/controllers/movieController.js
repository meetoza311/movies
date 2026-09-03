const Movie = require('../models/Movie');
const Show = require('../models/Show');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  cascadeDeleteMovies,
  getMovieDependencyCounts,
  enforceMaxMovies,
  MAX_MOVIES,
} = require('../services/movieCleanupService');
const logger = require('../utils/logger');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

const listMovies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.language) filter.language = new RegExp(`^${req.query.language}$`, 'i');
  if (req.query.search) {
    filter.title = new RegExp(req.query.search, 'i');
  }

  const sort =
    req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [movies, total] = await Promise.all([
    Movie.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Movie.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: 'Movies fetched',
    data: movies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id).lean();
  if (!movie) throw new AppError('Movie not found', 404, 'NOT_FOUND');

  const shows = await Show.find({ movieId: movie._id })
    .sort({ showDate: 1, startTime: 1 })
    .lean();

  res.json({
    success: true,
    message: 'Movie details',
    data: { ...movie, shows },
  });
});

const createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create({
    title: req.body.title,
    description: req.body.description || '',
    posterImage: req.body.posterImage || '',
    price: Number(req.body.price),
    status: 'now_showing',
  });

  const limitResult = await enforceMaxMovies();

  if (limitResult.enforced) {
    logger.info('Oldest movies removed to keep max limit', {
      max: MAX_MOVIES,
      deletedTitles: limitResult.deletedTitles,
    });
  }

  // Re-fetch in case this movie somehow was not among the newest (should not happen)
  const stillExists = await Movie.findById(movie._id);
  if (!stillExists) {
    throw new AppError(
      `Movie limit is ${MAX_MOVIES}. Your new movie could not be kept.`,
      409,
      'MOVIE_LIMIT'
    );
  }

  logger.info('Movie created', { id: String(movie._id), title: movie.title });

  const message = limitResult.enforced
    ? `Movie created. Oldest movie(s) removed to keep max ${MAX_MOVIES}: ${limitResult.deletedTitles.join(', ')}`
    : 'Movie created successfully';

  res.status(201).json({
    success: true,
    message,
    data: stillExists,
    meta: {
      maxMovies: MAX_MOVIES,
      autoRemoved: limitResult.enforced,
      removedMovies: limitResult.deletedTitles || [],
      removedCounts: {
        movies: limitResult.moviesDeleted || 0,
        shows: limitResult.showsDeleted || 0,
        seats: limitResult.seatsDeleted || 0,
        bookings: limitResult.bookingsDeleted || 0,
      },
    },
  });
});

const updateMovie = asyncHandler(async (req, res) => {
  const allowed = {};
  if (req.body.title !== undefined) allowed.title = req.body.title;
  if (req.body.description !== undefined) allowed.description = req.body.description;
  if (req.body.posterImage !== undefined) allowed.posterImage = req.body.posterImage;
  if (req.body.price !== undefined) allowed.price = Number(req.body.price);

  const movie = await Movie.findByIdAndUpdate(req.params.id, allowed, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!movie) throw new AppError('Movie not found', 404, 'NOT_FOUND');

  res.json({
    success: true,
    message: 'Movie updated successfully',
    data: movie,
  });
});

const deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new AppError('Movie not found', 404, 'NOT_FOUND');

  const deps = await getMovieDependencyCounts(movie._id);
  const result = await cascadeDeleteMovies([movie._id]);

  logger.info('Movie deleted', {
    id: String(movie._id),
    title: movie.title,
    ...result,
  });

  res.json({
    success: true,
    message: 'Movie and related data deleted successfully',
    data: { dependencies: deps, deleted: result },
  });
});

const getMovieDependencies = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id).select('_id title');
  if (!movie) throw new AppError('Movie not found', 404, 'NOT_FOUND');
  const deps = await getMovieDependencyCounts(movie._id);
  res.json({
    success: true,
    message: 'Movie dependencies',
    data: { movie, ...deps },
  });
});

module.exports = {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  getMovieDependencies,
};
