const Booking = require('../models/Booking');
const {
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBookingPermanently,
  lookupTicket,
  checkInTicket,
  listShowGateBookings,
  ensureScanToken,
} = require('../services/bookingService');
const { sendBookingTicketEmail } = require('../services/emailService');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

const POPULATE_SHOW =
  'showDate startTime endTime seatPrice guestPrice ownerPrice totalSeats status';

const listBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.status) filter.bookingStatus = req.query.status;
  if (req.query.movieId) filter.movieId = req.query.movieId;
  if (req.query.showId) filter.showId = req.query.showId;
  if (req.query.checkInStatus) filter.checkInStatus = req.query.checkInStatus;

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
      { customerEmail: new RegExp(q, 'i') },
    ];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('movieId', 'title posterImage language')
      .populate('showId', 'showDate startTime endTime seatPrice guestPrice ownerPrice')
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
  let booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

  booking = await ensureScanToken(booking);
  await booking.populate([
    { path: 'movieId', select: 'title posterImage language genre durationMinutes' },
    { path: 'showId', select: POPULATE_SHOW },
  ]);

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
    .populate('showId', POPULATE_SHOW);

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
    .populate('showId', POPULATE_SHOW);

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

const lookupTicketHandler = asyncHandler(async (req, res) => {
  const code = req.body.code || req.query.code;
  const showId = req.body.showId || req.query.showId;
  const data = await lookupTicket({ code, showId });
  res.json({
    success: true,
    message: 'Ticket found',
    data,
  });
});

const checkInTicketHandler = asyncHandler(async (req, res) => {
  const { code, showId, method } = req.body;
  const data = await checkInTicket({
    code,
    showId,
    method: method === 'MANUAL' ? 'MANUAL' : 'SCAN',
    adminId: req.admin?._id || null,
  });
  res.json({
    success: true,
    message: 'Ticket allotted successfully',
    data,
  });
});

const listShowGateHandler = asyncHandler(async (req, res) => {
  const data = await listShowGateBookings(req.params.showId);
  const pending = data.filter((b) => b.checkInStatus !== 'CHECKED_IN').length;
  const checkedIn = data.filter((b) => b.checkInStatus === 'CHECKED_IN').length;
  res.json({
    success: true,
    message: 'Show gate list',
    data,
    meta: { total: data.length, pending, checkedIn },
  });
});

const sendBookingEmailHandler = asyncHandler(async (req, res) => {
  let booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
  if (booking.bookingStatus === 'CANCELLED') {
    throw new AppError('Cannot email a cancelled booking', 400, 'BOOKING_CANCELLED');
  }

  const toEmail = String(booking.customerEmail || '')
    .trim()
    .toLowerCase();
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    throw new AppError(
      'This booking has no customer email. Edit the booking and add an email first.',
      400,
      'VALIDATION_ERROR'
    );
  }

  booking = await ensureScanToken(booking);
  await booking.populate([
    { path: 'movieId', select: 'title posterImage language genre durationMinutes' },
    { path: 'showId', select: POPULATE_SHOW },
  ]);

  const result = await sendBookingTicketEmail(booking.toObject(), toEmail);

  res.json({
    success: true,
    message: `Ticket emailed to ${toEmail}`,
    data: result,
  });
});

module.exports = {
  listBookings,
  getBooking,
  createBookingHandler,
  updateBookingHandler,
  cancelBookingHandler,
  deleteBookingHandler,
  lookupTicketHandler,
  checkInTicketHandler,
  listShowGateHandler,
  sendBookingEmailHandler,
};
