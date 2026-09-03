const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const { generateSeats } = require('../utils/generateSeats');
const { AppError } = require('../middleware/errorMiddleware');

async function createSeatsForShow(showId, totalSeats, session = null) {
  const seatDefs = generateSeats(totalSeats);
  const docs = seatDefs.map((s) => ({
    showId,
    seatNumber: s.seatNumber,
    row: s.row,
    column: s.column,
    status: 'AVAILABLE',
    bookingId: null,
  }));

  const options = session ? { session } : {};
  await Seat.insertMany(docs, options);
  return docs.length;
}

async function getSeatStats(showId) {
  const all = await Seat.aggregate([
    { $match: { showId: new mongoose.Types.ObjectId(String(showId)) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { total: 0, available: 0, booked: 0 };
  for (const row of all) {
    result.total += row.count;
    if (row._id === 'AVAILABLE') result.available = row.count;
    if (row._id === 'BOOKED') result.booked = row.count;
  }
  return result;
}

async function getSeatsByShow(showId) {
  return Seat.find({ showId }).sort({ row: 1, column: 1 }).lean();
}

async function assertSeatsAvailable(showId, seatNumbers, session, excludeBookingId = null) {
  const normalized = [...new Set(seatNumbers.map((s) => String(s).toUpperCase().trim()))];

  if (normalized.length === 0) {
    throw new AppError('At least one seat is required', 400, 'VALIDATION_ERROR');
  }

  if (normalized.length !== seatNumbers.length) {
    throw new AppError('Duplicate seats in selection', 400, 'VALIDATION_ERROR');
  }

  const seats = await Seat.find({
    showId,
    seatNumber: { $in: normalized },
  }).session(session);

  if (seats.length !== normalized.length) {
    const found = new Set(seats.map((s) => s.seatNumber));
    const missing = normalized.filter((n) => !found.has(n));
    throw new AppError(
      `Invalid seats for this show: ${missing.join(', ')}`,
      400,
      'INVALID_SEATS'
    );
  }

  const unavailable = seats.filter((s) => {
    if (s.status === 'AVAILABLE') return false;
    if (
      excludeBookingId &&
      s.bookingId &&
      String(s.bookingId) === String(excludeBookingId)
    ) {
      return false;
    }
    return true;
  });

  if (unavailable.length > 0) {
    throw new AppError(
      `One or more selected seats are already booked: ${unavailable
        .map((s) => s.seatNumber)
        .join(', ')}`,
      409,
      'SEAT_ALREADY_BOOKED'
    );
  }

  return { seats, normalized };
}

module.exports = {
  createSeatsForShow,
  getSeatStats,
  getSeatsByShow,
  assertSeatsAvailable,
};
