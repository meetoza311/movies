const Booking = require('../models/Booking');
const {
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBookingPermanently,
} = require('../services/bookingService');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

const listBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.status) filter.bookingStatus = req.query.status;
  if (req.query.movieId) filter.movieId = req.query.movieId;
  if (req.query.showId) filter.showId = req.query.showId;

  if (req.query.date) {
    const day = new Date(req.query.date);
    if (!Number.isNaN(day.getTime())) {
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      filter.createdAt = { $gte: day, $lt: next };
    }
  }

  if (req.query.search) {
    const q = String(req.query.search).trim();
    filter.$or = [
      { bookingNumber: new RegExp(q, 'i') },
      { customerName: new RegExp(q, 'i') },
      { mobileNumber: new RegExp(q, 'i') },
    ];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('movieId', 'title posterImage language')
      .populate('showId', 'showDate startTime endTime seatPrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: 'Bookings fetched',
    data: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('movieId', 'title posterImage language genre durationMinutes')
    .populate('showId', 'showDate startTime endTime seatPrice totalSeats status')
    .lean();

  if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

  res.json({
    success: true,
    message: 'Booking details',
    data: booking,
  });
});

const createBookingHandler = asyncHandler(async (req, res) => {
  const booking = await createBooking(req.body);
  const populated = await Booking.findById(booking._id)
    .populate('movieId', 'title posterImage language genre durationMinutes')
    .populate('showId', 'showDate startTime endTime seatPrice totalSeats status');

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: populated,
  });
});

const updateBookingHandler = asyncHandler(async (req, res) => {
  const booking = await updateBooking(req.params.id, req.body);
  const populated = await Booking.findById(booking._id)
    .populate('movieId', 'title posterImage language genre durationMinutes')
    .populate('showId', 'showDate startTime endTime seatPrice totalSeats status');

  res.json({
    success: true,
    message: 'Booking updated successfully',
    data: populated,
  });
});

const cancelBookingHandler = asyncHandler(async (req, res) => {
  const booking = await cancelBooking(req.params.id);
  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    data: booking,
  });
});

const deleteBookingHandler = asyncHandler(async (req, res) => {
  await deleteBookingPermanently(req.params.id);
  res.json({
    success: true,
    message: 'Booking permanently deleted',
    data: null,
  });
});

module.exports = {
  listBookings,
  getBooking,
  createBookingHandler,
  updateBookingHandler,
  cancelBookingHandler,
  deleteBookingHandler,
};
