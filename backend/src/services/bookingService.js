const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat');
const { generateBookingNumber } = require('../utils/generateBookingNumber');
const { assertSeatsAvailable } = require('./seatService');
const { AppError } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function validateCustomer(customerName, mobileNumber) {
  const name = String(customerName || '').trim();
  const mobile = String(mobileNumber || '').trim();

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

  return { name, mobile };
}

function normalizeSeatInput(seats) {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new AppError('At least one seat is required', 400, 'VALIDATION_ERROR');
  }

  return seats.map((s) => {
    if (typeof s === 'string') return s.toUpperCase().trim();
    if (s && s.seatNumber) return String(s.seatNumber).toUpperCase().trim();
    throw new AppError('Invalid seat format', 400, 'VALIDATION_ERROR');
  });
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

/**
 * Fallback when transactions are unavailable (standalone MongoDB).
 * Still uses atomic seat updates with status checks.
 */
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

async function createBooking({ showId, customerName, mobileNumber, seats }) {
  const { name, mobile } = validateCustomer(customerName, mobileNumber);
  const seatNumbers = normalizeSeatInput(seats);

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

    await assertSeatsAvailable(show._id, seatNumbers, session);

    const numberOfSeats = seatNumbers.length;
    const seatPrice = show.seatPrice;
    const totalAmount = seatPrice * numberOfSeats;
    const bookingNumber = await generateBookingNumber(session);

    const bookingDocs = [
      {
        bookingNumber,
        movieId: show.movieId,
        showId: show._id,
        customerName: name,
        mobileNumber: mobile,
        seats: seatNumbers.map((seatNumber) => ({ seatNumber })),
        seatPrice,
        numberOfSeats,
        totalAmount,
        bookingStatus: 'CONFIRMED',
        bookingDate: new Date(),
      },
    ];

    const created = await Booking.create(bookingDocs, session ? { session } : {});
    const booking = created[0];

    const updateResult = await Seat.updateMany(
      {
        showId: show._id,
        seatNumber: { $in: seatNumbers },
        status: 'AVAILABLE',
      },
      {
        $set: { status: 'BOOKED', bookingId: booking._id },
      },
      session ? { session } : {}
    );

    if (updateResult.modifiedCount !== numberOfSeats) {
      if (!session) {
        await Booking.deleteOne({ _id: booking._id });
      }
      throw new AppError(
        'One or more selected seats are already booked',
        409,
        'SEAT_ALREADY_BOOKED'
      );
    }

    logger.info('Booking created', { bookingNumber, showId: String(show._id) });
    return booking;
  });
}

async function updateBooking(bookingId, { customerName, mobileNumber, seats }) {
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

    if (customerName !== undefined || mobileNumber !== undefined) {
      const { name, mobile } = validateCustomer(
        customerName !== undefined ? customerName : booking.customerName,
        mobileNumber !== undefined ? mobileNumber : booking.mobileNumber
      );
      booking.customerName = name;
      booking.mobileNumber = mobile;
    }

    if (seats !== undefined) {
      const seatNumbers = normalizeSeatInput(seats);
      const showQuery = Show.findById(booking.showId);
      if (session) showQuery.session(session);
      const show = await showQuery;
      if (!show) {
        throw new AppError('Show not found', 404, 'NOT_FOUND');
      }

      const oldSeats = booking.seats.map((s) => s.seatNumber);

      await Seat.updateMany(
        {
          showId: booking.showId,
          seatNumber: { $in: oldSeats },
          bookingId: booking._id,
        },
        { $set: { status: 'AVAILABLE', bookingId: null } },
        session ? { session } : {}
      );

      await assertSeatsAvailable(booking.showId, seatNumbers, session, booking._id);

      const updateResult = await Seat.updateMany(
        {
          showId: booking.showId,
          seatNumber: { $in: seatNumbers },
          status: 'AVAILABLE',
        },
        { $set: { status: 'BOOKED', bookingId: booking._id } },
        session ? { session } : {}
      );

      if (updateResult.modifiedCount !== seatNumbers.length) {
        throw new AppError(
          'One or more selected seats are already booked',
          409,
          'SEAT_ALREADY_BOOKED'
        );
      }

      booking.seats = seatNumbers.map((seatNumber) => ({ seatNumber }));
      booking.numberOfSeats = seatNumbers.length;
      booking.seatPrice = show.seatPrice;
      booking.totalAmount = show.seatPrice * seatNumbers.length;
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
      { $set: { status: 'AVAILABLE', bookingId: null } },
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
        { $set: { status: 'AVAILABLE', bookingId: null } },
        session ? { session } : {}
      );
    }

    await Booking.deleteOne({ _id: booking._id }, session ? { session } : {});
    logger.info('Booking permanently deleted', { bookingNumber: booking.bookingNumber });
    return booking;
  });
}

module.exports = {
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBookingPermanently,
  validateCustomer,
  INDIAN_MOBILE,
};
