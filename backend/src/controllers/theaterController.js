const Theater = require('../models/Theater');
const Show = require('../models/Show');
const { buildTheaterLayout } = require('../utils/generateSeats');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  enforceMaxTheaters,
  MAX_THEATERS,
} = require('../services/movieCleanupService');
const logger = require('../utils/logger');

function parseLayout(body) {
  try {
    return buildTheaterLayout(Number(body.rowCount), body.rowSeats);
  } catch (err) {
    throw new AppError(err.message, 400, 'VALIDATION_ERROR');
  }
}

const listTheaters = asyncHandler(async (_req, res) => {
  const theaters = await Theater.find().sort({ name: 1 }).lean();
  res.json({
    success: true,
    message: 'Theaters fetched',
    data: theaters,
  });
});

const getTheater = asyncHandler(async (req, res) => {
  const theater = await Theater.findById(req.params.id).lean();
  if (!theater) throw new AppError('Theater not found', 404, 'NOT_FOUND');
  res.json({
    success: true,
    message: 'Theater details',
    data: theater,
  });
});

const createTheater = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new AppError('Theater name is required', 400, 'VALIDATION_ERROR');

  const exists = await Theater.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (exists) {
    throw new AppError('A theater with this name already exists', 409, 'DUPLICATE_THEATER');
  }

  const layout = parseLayout(req.body);
  const theater = await Theater.create({
    name,
    rowCount: layout.rowCount,
    rows: layout.rows,
    totalSeats: layout.totalSeats,
  });

  const limitResult = await enforceMaxTheaters();
  if (limitResult.enforced) {
    logger.info('Oldest screens removed to keep max limit', {
      max: MAX_THEATERS,
      deleted: limitResult.deletedLabels,
    });
  }

  const kept = await Theater.findById(theater._id);
  if (!kept) {
    throw new AppError(
      `Screen limit is ${MAX_THEATERS}. Your new screen could not be kept.`,
      409,
      'THEATER_LIMIT'
    );
  }

  logger.info('Theater created', { id: String(theater._id), name: theater.name });

  res.status(201).json({
    success: true,
    message: limitResult.enforced
      ? `Screen created. Oldest screen(s) removed to keep max ${MAX_THEATERS}: ${(limitResult.deletedLabels || []).join(', ')}`
      : 'Theater created successfully',
    data: theater,
  });
});

const updateTheater = asyncHandler(async (req, res) => {
  const theater = await Theater.findById(req.params.id);
  if (!theater) throw new AppError('Theater not found', 404, 'NOT_FOUND');

  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) throw new AppError('Theater name is required', 400, 'VALIDATION_ERROR');
    const exists = await Theater.findOne({
      _id: { $ne: theater._id },
      name: new RegExp(`^${name}$`, 'i'),
    });
    if (exists) {
      throw new AppError('A theater with this name already exists', 409, 'DUPLICATE_THEATER');
    }
    theater.name = name;
  }

  if (req.body.rowCount !== undefined || req.body.rowSeats !== undefined) {
    const showCount = await Show.countDocuments({ theaterId: theater._id });
    if (showCount > 0) {
      throw new AppError(
        `Seat layout cannot change because ${showCount} show(s) use this screen`,
        409,
        'THEATER_IN_USE'
      );
    }
    const layout = parseLayout({
      rowCount: req.body.rowCount ?? theater.rowCount,
      rowSeats: req.body.rowSeats ?? theater.rows.map((r) => r.seats),
    });
    theater.rowCount = layout.rowCount;
    theater.rows = layout.rows;
    theater.totalSeats = layout.totalSeats;
  }

  await theater.save();

  res.json({
    success: true,
    message: 'Theater updated successfully',
    data: theater,
  });
});

const deleteTheater = asyncHandler(async (req, res) => {
  const theater = await Theater.findById(req.params.id);
  if (!theater) throw new AppError('Theater not found', 404, 'NOT_FOUND');

  const showCount = await Show.countDocuments({ theaterId: theater._id });
  if (showCount > 0) {
    throw new AppError(
      `Cannot delete this screen — ${showCount} show(s) still use it`,
      409,
      'THEATER_IN_USE'
    );
  }

  await theater.deleteOne();
  logger.info('Theater deleted', { id: String(theater._id), name: theater.name });

  res.json({
    success: true,
    message: 'Theater deleted successfully',
    data: null,
  });
});

module.exports = {
  listTheaters,
  getTheater,
  createTheater,
  updateTheater,
  deleteTheater,
};
