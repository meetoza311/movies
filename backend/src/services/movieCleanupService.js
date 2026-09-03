const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

const MAX_MOVIES = 10;

/**
 * After a new movie is added, if total > MAX_MOVIES, delete the oldest
 * movies (by createdAt) with all related shows, seats, and bookings.
 */
async function enforceMaxMovies() {
  const total = await Movie.countDocuments();
  if (total <= MAX_MOVIES) {
    return {
      enforced: false,
      moviesBefore: total,
      moviesRetained: total,
      moviesDeleted: 0,
      showsDeleted: 0,
      seatsDeleted: 0,
      bookingsDeleted: 0,
      deletedTitles: [],
    };
  }

  const keepIds = await Movie.find()
    .sort({ createdAt: -1 })
    .limit(MAX_MOVIES)
    .select('_id')
    .lean();

  const keepIdSet = keepIds.map((m) => m._id);
  const toDelete = await Movie.find({ _id: { $nin: keepIdSet } })
    .select('_id title')
    .lean();
  const deleteIds = toDelete.map((m) => m._id);
  const deletedTitles = toDelete.map((m) => m.title);

  logger.info('Max movies exceeded — removing oldest movies', {
    total,
    max: MAX_MOVIES,
    deleting: deletedTitles,
  });

  const result = await cascadeDeleteMovies(deleteIds);

  return {
    enforced: true,
    moviesBefore: total,
    moviesRetained: MAX_MOVIES,
    deletedTitles,
    ...result,
  };
}

async function cascadeDeleteMovies(movieIds) {
  if (!movieIds.length) {
    return { moviesDeleted: 0, showsDeleted: 0, seatsDeleted: 0, bookingsDeleted: 0 };
  }

  const run = async (session) => {
    const shows = await Show.find({ movieId: { $in: movieIds } })
      .select('_id')
      .session(session)
      .lean();
    const showIds = shows.map((s) => s._id);

    let seatsDeleted = 0;
    let bookingsDeleted = 0;
    let showsDeleted = 0;

    if (showIds.length) {
      const seatRes = await Seat.deleteMany(
        { showId: { $in: showIds } },
        session ? { session } : {}
      );
      seatsDeleted = seatRes.deletedCount || 0;

      const bookingRes = await Booking.deleteMany(
        { $or: [{ movieId: { $in: movieIds } }, { showId: { $in: showIds } }] },
        session ? { session } : {}
      );
      bookingsDeleted = bookingRes.deletedCount || 0;

      const showRes = await Show.deleteMany(
        { _id: { $in: showIds } },
        session ? { session } : {}
      );
      showsDeleted = showRes.deletedCount || 0;
    } else {
      const bookingRes = await Booking.deleteMany(
        { movieId: { $in: movieIds } },
        session ? { session } : {}
      );
      bookingsDeleted = bookingRes.deletedCount || 0;
    }

    const movieRes = await Movie.deleteMany(
      { _id: { $in: movieIds } },
      session ? { session } : {}
    );

    return {
      moviesDeleted: movieRes.deletedCount || 0,
      showsDeleted,
      seatsDeleted,
      bookingsDeleted,
    };
  };

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await run(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    const msg = String(err.message || '');
    if (
      msg.includes('Transaction numbers are only allowed') ||
      msg.includes('replica set') ||
      err.code === 20
    ) {
      logger.warn('Transactions unavailable for cascade delete; running sequential deletes');
      return run(null);
    }
    throw err;
  }
}

async function getMovieDependencyCounts(movieId) {
  const shows = await Show.countDocuments({ movieId });
  const showIds = await Show.find({ movieId }).select('_id').lean();
  const ids = showIds.map((s) => s._id);
  const bookings = await Booking.countDocuments({
    $or: [{ movieId }, { showId: { $in: ids } }],
  });
  return { shows, bookings };
}

module.exports = {
  enforceMaxMovies,
  cascadeDeleteMovies,
  getMovieDependencyCounts,
  MAX_MOVIES,
};
