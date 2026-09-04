const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat');
const { generateBookingNumber } = require('../utils/generateBookingNumber');
const { generateScanToken } = require('../utils/generateScanToken');
const { assertSeatsAvailable } = require('./seatService');
const { AppError } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = new Set(['GUEST', 'OWNER']);

function validateCustomer(customerName, mobileNumber, customerEmail, { requireEmail = true } = {}) {
  const name = String(customerName || '').trim();
  const mobile = String(mobileNumber || '').trim();
  const email = String(customerEmail || '').trim().toLowerCase();

  if (name.length < 2 || name.length > 100) {
    throw new AppError(
      'Customer name must be between 2 and 100 characters',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!INDIAN_MOBILE.test(mobile)) {
    throw new AppError(
      'Mobile number must be a valid 10-digit Indian number',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (email) {
    if (!EMAIL_RE.test(email)) {
      throw new AppError('Valid customer email is required', 400, 'VALIDATION_ERROR');
    }
  } else if (requireEmail) {
    throw new AppError('Valid customer email is required', 400, 'VALIDATION_ERROR');
  }

  return { name, mobile, email };
}

function resolveShowPrices(show) {
  const guestPrice =
    show.guestPrice != null && !Number.isNaN(Number(show.guestPrice))
      ? Number(show.guestPrice)
      : Number(show.seatPrice) || 80;
  const ownerPrice =
    show.ownerPrice != null && !Number.isNaN(Number(show.ownerPrice))
      ? Number(show.ownerPrice)
      : 50;
  return { guestPrice, ownerPrice };
}

/**
 * Accepts:
 * - ["A1","A2"] → all GUEST (legacy)
 * - [{ seatNumber, category }]
 */
function normalizeSeatSelection(seats, prices) {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new AppError('At least one seat is required', 400, 'VALIDATION_ERROR');
  }

  const normalized = seats.map((s) => {
    let seatNumber;
    let category = 'GUEST';

    if (typeof s === 'string') {
      seatNumber = s.toUpperCase().trim();
    } else if (s && s.seatNumber) {
      seatNumber = String(s.seatNumber).toUpperCase().trim();
      if (s.category) {
        category = String(s.category).toUpperCase().trim();
      }
    } else {
      throw new AppError('Invalid seat format', 400, 'VALIDATION_ERROR');
    }

    if (!CATEGORIES.has(category)) {
      throw new AppError(
        'Seat category must be GUEST or OWNER',
        400,
        'VALIDATION_ERROR'
      );
    }

    const price = category === 'OWNER' ? prices.ownerPrice : prices.guestPrice;
    return { seatNumber, category, price };
  });

  const unique = new Set(normalized.map((s) => s.seatNumber));
  if (unique.size !== normalized.length) {
    throw new AppError('Duplicate seats in selection', 400, 'VALIDATION_ERROR');
  }

  return normalized;
}

async function withTransaction(work) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function withSafeSession(work) {
  try {
    return await withTransaction(work);
  } catch (err) {
    const msg = String(err.message || '');
    if (
      msg.includes('Transaction numbers are only allowed') ||
      msg.includes('replica set') ||
      err.code === 20
    ) {
      logger.warn('MongoDB transactions unavailable; using atomic seat updates fallback');
      return work(null);
    }
    throw err;
  }
}

function sanitizeOptionalText(value, maxLen) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

async function createBooking({
  showId,
  customerName,
  mobileNumber,
  customerEmail,
  blockNo,
  notes,
  seats,
}) {
  const { name, mobile, email } = validateCustomer(customerName, mobileNumber, customerEmail, {
    requireEmail: true,
  });
  const block = sanitizeOptionalText(blockNo, 80);
  const comment = sanitizeOptionalText(notes, 500);

  return withSafeSession(async (session) => {
    const showQuery = Show.findById(showId);
    if (session) showQuery.session(session);
    const show = await showQuery;

    if (!show) {
      throw new AppError('Show not found', 404, 'NOT_FOUND');
    }
    if (show.status === 'cancelled') {
      throw new AppError('Cannot book seats for a cancelled show', 400, 'SHOW_CANCELLED');
    }

    const movieQuery = Movie.findById(show.movieId);
    if (session) movieQuery.session(session);
    const movie = await movieQuery;
    if (!movie) {
      throw new AppError('Movie not found', 404, 'NOT_FOUND');
    }

    const prices = resolveShowPrices(show);
    const seatItems = normalizeSeatSelection(seats, prices);
    const seatNumbers = seatItems.map((s) => s.seatNumber);

    await assertSeatsAvailable(show._id, seatNumbers, session);

    const numberOfSeats = seatItems.length;
    const totalAmount = seatItems.reduce((sum, s) => sum + s.price, 0);
    const seatPrice = numberOfSeats ? totalAmount / numberOfSeats : prices.guestPrice;
    const bookingNumber = await generateBookingNumber(session);

    const bookingDocs = [
      {
        bookingNumber,
        movieId: show.movieId,
        showId: show._id,
        customerName: name,
        mobileNumber: mobile,
        customerEmail: email,
        blockNo: block,
        notes: comment,
        seats: seatItems,
        guestPrice: prices.guestPrice,
        ownerPrice: prices.ownerPrice,
        seatPrice,
        numberOfSeats,
        totalAmount,
        bookingStatus: 'CONFIRMED',
        bookingDate: new Date(),
        scanToken: generateScanToken(),
        checkInStatus: 'PENDING',
      },
    ];

    const created = await Booking.create(bookingDocs, session ? { session } : {});
    const booking = created[0];

    // Update each seat with its category
    for (const item of seatItems) {
      const result = await Seat.updateOne(
        {
          showId: show._id,
          seatNumber: item.seatNumber,
          status: 'AVAILABLE',
        },
        {
          $set: {
            status: 'BOOKED',
            bookingId: booking._id,
            category: item.category,
          },
        },
        session ? { session } : {}
      );

      if (result.modifiedCount !== 1) {
        if (!session) {
          await Seat.updateMany(
            { bookingId: booking._id },
            { $set: { status: 'AVAILABLE', bookingId: null }, $unset: { category: 1 } }
          );
          await Booking.deleteOne({ _id: booking._id });
        }
        throw new AppError(
          'One or more selected seats are already booked',
          409,
          'SEAT_ALREADY_BOOKED'
        );
      }
    }

    logger.info('Booking created', { bookingNumber, showId: String(show._id) });
    return booking;
  });
}

async function updateBooking(
  bookingId,
  { customerName, mobileNumber, customerEmail, blockNo, notes, seats }
) {
  return withSafeSession(async (session) => {
    const bookingQuery = Booking.findById(bookingId);
    if (session) bookingQuery.session(session);
    const booking = await bookingQuery;

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }
    if (booking.bookingStatus === 'CANCELLED') {
      throw new AppError('Cannot edit a cancelled booking', 400, 'BOOKING_CANCELLED');
    }

    if (
      customerName !== undefined ||
      mobileNumber !== undefined ||
      customerEmail !== undefined
    ) {
      const { name, mobile, email } = validateCustomer(
        customerName !== undefined ? customerName : booking.customerName,
        mobileNumber !== undefined ? mobileNumber : booking.mobileNumber,
        customerEmail !== undefined ? customerEmail : booking.customerEmail,
        { requireEmail: true }
      );
      booking.customerName = name;
      booking.mobileNumber = mobile;
      booking.customerEmail = email;
    }

    if (blockNo !== undefined) {
      booking.blockNo = sanitizeOptionalText(blockNo, 80);
    }
    if (notes !== undefined) {
      booking.notes = sanitizeOptionalText(notes, 500);
    }

    if (seats !== undefined) {
      const showQuery = Show.findById(booking.showId);
      if (session) showQuery.session(session);
      const show = await showQuery;
      if (!show) {
        throw new AppError('Show not found', 404, 'NOT_FOUND');
      }

      const prices = resolveShowPrices(show);
      const seatItems = normalizeSeatSelection(seats, prices);
      const seatNumbers = seatItems.map((s) => s.seatNumber);
      const oldSeats = booking.seats.map((s) => s.seatNumber);

      await Seat.updateMany(
        {
          showId: booking.showId,
          seatNumber: { $in: oldSeats },
          bookingId: booking._id,
        },
        {
          $set: { status: 'AVAILABLE', bookingId: null },
          $unset: { category: 1 },
        },
        session ? { session } : {}
      );

      await assertSeatsAvailable(booking.showId, seatNumbers, session, booking._id);

      for (const item of seatItems) {
        const result = await Seat.updateOne(
          {
            showId: booking.showId,
            seatNumber: item.seatNumber,
            status: 'AVAILABLE',
          },
          {
            $set: {
              status: 'BOOKED',
              bookingId: booking._id,
              category: item.category,
            },
          },
          session ? { session } : {}
        );

        if (result.modifiedCount !== 1) {
          throw new AppError(
            'One or more selected seats are already booked',
            409,
            'SEAT_ALREADY_BOOKED'
          );
        }
      }

      const totalAmount = seatItems.reduce((sum, s) => sum + s.price, 0);
      booking.seats = seatItems;
      booking.numberOfSeats = seatItems.length;
      booking.guestPrice = prices.guestPrice;
      booking.ownerPrice = prices.ownerPrice;
      booking.seatPrice = totalAmount / seatItems.length;
      booking.totalAmount = totalAmount;
    }

    await booking.save(session ? { session } : {});
    logger.info('Booking updated', { bookingNumber: booking.bookingNumber });
    return booking;
  });
}

async function cancelBooking(bookingId) {
  return withSafeSession(async (session) => {
    const bookingQuery = Booking.findById(bookingId);
    if (session) bookingQuery.session(session);
    const booking = await bookingQuery;

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }
    if (booking.bookingStatus === 'CANCELLED') {
      throw new AppError('Booking is already cancelled', 400, 'ALREADY_CANCELLED');
    }

    const seatNumbers = booking.seats.map((s) => s.seatNumber);

    await Seat.updateMany(
      {
        showId: booking.showId,
        seatNumber: { $in: seatNumbers },
        bookingId: booking._id,
      },
      {
        $set: { status: 'AVAILABLE', bookingId: null },
        $unset: { category: 1 },
      },
      session ? { session } : {}
    );

    booking.bookingStatus = 'CANCELLED';
    await booking.save(session ? { session } : {});

    logger.info('Booking cancelled', { bookingNumber: booking.bookingNumber });
    return booking;
  });
}

async function deleteBookingPermanently(bookingId) {
  return withSafeSession(async (session) => {
    const bookingQuery = Booking.findById(bookingId);
    if (session) bookingQuery.session(session);
    const booking = await bookingQuery;

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    if (booking.bookingStatus === 'CONFIRMED') {
      const seatNumbers = booking.seats.map((s) => s.seatNumber);
      await Seat.updateMany(
        {
          showId: booking.showId,
          seatNumber: { $in: seatNumbers },
          bookingId: booking._id,
        },
        {
          $set: { status: 'AVAILABLE', bookingId: null },
          $unset: { category: 1 },
        },
        session ? { session } : {}
      );
    }

    await Booking.deleteOne({ _id: booking._id }, session ? { session } : {});
    logger.info('Booking permanently deleted', { bookingNumber: booking.bookingNumber });
    return booking;
  });
}

async function ensureScanToken(booking) {
  if (booking.scanToken) return booking;
  booking.scanToken = generateScanToken();
  if (!booking.checkInStatus) booking.checkInStatus = 'PENDING';
  await booking.save();
  return booking;
}

function parseGateCode(raw) {
  const code = String(raw || '').trim();
  if (!code) {
    throw new AppError('Ticket code is required', 400, 'VALIDATION_ERROR');
  }

  // Accept plain token, booking number, or payload like SS:<token> / JSON
  if (code.startsWith('{')) {
    try {
      const parsed = JSON.parse(code);
      return String(parsed.token || parsed.scanToken || parsed.code || '').trim();
    } catch {
      /* fall through */
    }
  }

  const prefixed = code.match(/^(?:SS|SAVAN)[:|#-](.+)$/i);
  if (prefixed) return prefixed[1].trim();

  return code;
}

async function findBookingByGateCode(code) {
  const value = parseGateCode(code);
  const upper = value.toUpperCase();

  let booking = await Booking.findOne({ scanToken: value });
  if (!booking && /^[A-F0-9]{32}$/i.test(value)) {
    booking = await Booking.findOne({ scanToken: value.toLowerCase() });
  }
  if (!booking) {
    booking = await Booking.findOne({ bookingNumber: upper });
  }
  if (!booking) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  await ensureScanToken(booking);
  return booking;
}

function serializeGateBooking(booking) {
  const obj = booking.toObject ? booking.toObject() : booking;
  return {
    _id: obj._id,
    bookingNumber: obj.bookingNumber,
    scanToken: obj.scanToken,
    customerName: obj.customerName,
    mobileNumber: obj.mobileNumber,
    customerEmail: obj.customerEmail,
    blockNo: obj.blockNo,
    notes: obj.notes,
    seats: obj.seats,
    numberOfSeats: obj.numberOfSeats,
    totalAmount: obj.totalAmount,
    guestPrice: obj.guestPrice,
    ownerPrice: obj.ownerPrice,
    bookingStatus: obj.bookingStatus,
    checkInStatus: obj.checkInStatus || 'PENDING',
    checkedInAt: obj.checkedInAt,
    checkInMethod: obj.checkInMethod,
    movieId: obj.movieId,
    showId: obj.showId,
  };
}

/**
 * Lookup ticket without checking in (preview).
 * Optional showId — if provided and mismatch, error WRONG_SHOW.
 */
async function lookupTicket({ code, showId }) {
  const booking = await findBookingByGateCode(code);
  await booking.populate([
    { path: 'movieId', select: 'title posterImage language' },
    {
      path: 'showId',
      select: 'showDate startTime endTime guestPrice ownerPrice seatPrice status',
    },
  ]);

  if (showId && String(booking.showId._id || booking.showId) !== String(showId)) {
    throw new AppError(
      'This ticket belongs to a different show',
      409,
      'WRONG_SHOW'
    );
  }

  return serializeGateBooking(booking);
}

/**
 * Check in / allot ticket at gate.
 * method: SCAN | MANUAL
 */
async function checkInTicket({ code, showId, method = 'SCAN', adminId = null }) {
  if (!showId) {
    throw new AppError('showId is required for gate check-in', 400, 'VALIDATION_ERROR');
  }

  const booking = await findBookingByGateCode(code);

  if (String(booking.showId) !== String(showId)) {
    await booking.populate([
      { path: 'movieId', select: 'title' },
      { path: 'showId', select: 'showDate startTime' },
    ]);
    throw new AppError(
      'This ticket belongs to a different show',
      409,
      'WRONG_SHOW'
    );
  }

  if (booking.bookingStatus === 'CANCELLED') {
    throw new AppError('This booking is cancelled', 400, 'BOOKING_CANCELLED');
  }

  if (booking.checkInStatus === 'CHECKED_IN') {
    await booking.populate([
      { path: 'movieId', select: 'title posterImage language' },
      {
        path: 'showId',
        select: 'showDate startTime endTime guestPrice ownerPrice seatPrice status',
      },
    ]);
    const err = new AppError(
      'Already scanned / allotted — this ticket was already checked in',
      409,
      'ALREADY_CHECKED_IN'
    );
    err.data = serializeGateBooking(booking);
    throw err;
  }

  booking.checkInStatus = 'CHECKED_IN';
  booking.checkedInAt = new Date();
  booking.checkInMethod = method === 'MANUAL' ? 'MANUAL' : 'SCAN';
  if (adminId) booking.checkedInBy = adminId;
  await booking.save();

  await booking.populate([
    { path: 'movieId', select: 'title posterImage language' },
    {
      path: 'showId',
      select: 'showDate startTime endTime guestPrice ownerPrice seatPrice status',
    },
  ]);

  logger.info('Ticket checked in', {
    bookingNumber: booking.bookingNumber,
    method: booking.checkInMethod,
  });

  return serializeGateBooking(booking);
}

async function listShowGateBookings(showId) {
  const bookings = await Booking.find({ showId })
    .populate('movieId', 'title')
    .sort({ checkedInAt: -1, createdAt: -1 })
    .lean();

  return bookings.map((b) => ({
    ...b,
    checkInStatus: b.checkInStatus || 'PENDING',
    scanToken: b.scanToken || null,
  }));
}

module.exports = {
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBookingPermanently,
  validateCustomer,
  resolveShowPrices,
  ensureScanToken,
  lookupTicket,
  checkInTicket,
  listShowGateBookings,
  INDIAN_MOBILE,
};
