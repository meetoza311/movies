const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { createSeatsForShow, getSeatStats } = require('../services/seatService');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseShowDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('Invalid show date', 400, 'VALIDATION_ERROR');
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

const listShows = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.movieId) filter.movieId = req.query.movieId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.date) {
    const day = parseShowDate(req.query.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    filter.showDate = { $gte: day, $lt: next };
  }

  const [shows, total] = await Promise.all([
    Show.find(filter)
      .populate('movieId', 'title posterImage language genre durationMinutes price')
      .sort({ showDate: 1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Show.countDocuments(filter),
  ]);

  const withStats = await Promise.all(
    shows.map(async (show) => {
      const seats = await getSeatStats(show._id);
      return { ...show, seats };
    })
  );

  res.json({
    success: true,
    message: 'Shows fetched',
    data: withStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('movieId', 'title posterImage language genre durationMinutes price status')
    .lean();
  if (!show) throw new AppError('Show not found', 404, 'NOT_FOUND');

  const seats = await getSeatStats(show._id);
  const bookings = await Booking.find({ showId: show._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    message: 'Show details',
    data: { ...show, seats, bookings },
  });
});

const createShow = asyncHandler(async (req, res) => {
  const {
    movieId,
    showDate,
    startTime,
    endTime,
    totalSeats,
    seatPrice,
    status,
  } = req.body;

  const movie = await Movie.findById(movieId);
  if (!movie) throw new AppError('Movie not found', 404, 'NOT_FOUND');

  const seatsCount = parseInt(totalSeats, 10);
  if (!Number.isInteger(seatsCount) || seatsCount <= 0) {
    throw new AppError('Total seats must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  const price =
    seatPrice !== undefined && seatPrice !== null && seatPrice !== ''
      ? Number(seatPrice)
      : movie.price;

  if (Number.isNaN(price) || price < 0) {
    throw new AppError('Seat price must be >= 0', 400, 'VALIDATION_ERROR');
  }

  const date = parseShowDate(showDate);

  const duplicate = await Show.findOne({
    movieId,
    showDate: date,
    startTime: String(startTime).trim(),
  });
  if (duplicate) {
    throw new AppError(
      'A show already exists for this movie, date, and start time',
      409,
      'DUPLICATE_SHOW'
    );
  }

  const show = await Show.create({
    movieId,
    showDate: date,
    startTime: String(startTime).trim(),
    endTime: String(endTime).trim(),
    totalSeats: seatsCount,
    seatPrice: price,
    status: status || 'scheduled',
  });

  await createSeatsForShow(show._id, seatsCount);
  logger.info('Show created', { id: String(show._id), movieId: String(movieId) });

  const seats = await getSeatStats(show._id);

  res.status(201).json({
    success: true,
    message: 'Show created successfully',
    data: { ...show.toObject(), seats },
  });
});

const updateShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new AppError('Show not found', 404, 'NOT_FOUND');

  const { showDate, startTime, endTime, seatPrice, status } = req.body;

  if (showDate) show.showDate = parseShowDate(showDate);
  if (startTime) show.startTime = String(startTime).trim();
  if (endTime) show.endTime = String(endTime).trim();
  if (seatPrice !== undefined) {
    const price = Number(seatPrice);
    if (Number.isNaN(price) || price < 0) {
      throw new AppError('Seat price must be >= 0', 400, 'VALIDATION_ERROR');
    }
    show.seatPrice = price;
  }
  if (status) show.status = status;

  // totalSeats is not editable after creation (would break seat layout)
  if (req.body.totalSeats !== undefined && Number(req.body.totalSeats) !== show.totalSeats) {
    throw new AppError(
      'Total seats cannot be changed after show creation',
      400,
      'SEATS_LOCKED'
    );
  }

  if (showDate || startTime) {
    const duplicate = await Show.findOne({
      _id: { $ne: show._id },
      movieId: show.movieId,
      showDate: show.showDate,
      startTime: show.startTime,
    });
    if (duplicate) {
      throw new AppError(
        'A show already exists for this movie, date, and start time',
        409,
        'DUPLICATE_SHOW'
      );
    }
  }

  await show.save();
  const seats = await getSeatStats(show._id);

  res.json({
    success: true,
    message: 'Show updated successfully',
    data: { ...show.toObject(), seats },
  });
});

const deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new AppError('Show not found', 404, 'NOT_FOUND');

  const bookingCount = await Booking.countDocuments({ showId: show._id });
  if (bookingCount > 0 && req.query.force !== 'true') {
    throw new AppError(
      `This show has ${bookingCount} booking(s). Pass force=true to delete show, seats, and bookings.`,
      409,
      'HAS_BOOKINGS'
    );
  }

  await Seat.deleteMany({ showId: show._id });
  await Booking.deleteMany({ showId: show._id });
  await show.deleteOne();

  logger.info('Show deleted', { id: String(show._id) });

  res.json({
    success: true,
    message: 'Show deleted successfully',
    data: null,
  });
});

module.exports = {
  listShows,
  getShow,
  createShow,
  updateShow,
  deleteShow,
};
