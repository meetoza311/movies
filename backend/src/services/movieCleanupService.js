const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Theater = require('../models/Theater');
const logger = require('../utils/logger');

/** Keep only this many newest records per catalog type. */
const MAX_MOVIES = 5;
const MAX_SHOWS = 5;
const MAX_THEATERS = 5;

async function withOptionalTransaction(run) {
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

async function cascadeDeleteShows(showIds, session = null) {
  if (!showIds.length) {
    return { showsDeleted: 0, seatsDeleted: 0, bookingsDeleted: 0 };
  }

  const opts = session ? { session } : {};

  const seatRes = await Seat.deleteMany({ showId: { $in: showIds } }, opts);
  const bookingRes = await Booking.deleteMany({ showId: { $in: showIds } }, opts);
  const showRes = await Show.deleteMany({ _id: { $in: showIds } }, opts);

  return {
    showsDeleted: showRes.deletedCount || 0,
    seatsDeleted: seatRes.deletedCount || 0,
    bookingsDeleted: bookingRes.deletedCount || 0,
  };
}

async function cascadeDeleteMovies(movieIds) {
  if (!movieIds.length) {
    return { moviesDeleted: 0, showsDeleted: 0, seatsDeleted: 0, bookingsDeleted: 0 };
  }

  // Screens/theaters are independent — never deleted here.
  // Only this movie's shows → seats → bookings are removed.
  return withOptionalTransaction(async (session) => {
    const showQuery = Show.find({ movieId: { $in: movieIds } }).select('_id');
    if (session) showQuery.session(session);
    const shows = await showQuery.lean();
    const showIds = shows.map((s) => s._id);

    let seatsDeleted = 0;
    let bookingsDeleted = 0;
    let showsDeleted = 0;

    if (showIds.length) {
      const showCascade = await cascadeDeleteShows(showIds, session);
      seatsDeleted = showCascade.seatsDeleted;
      bookingsDeleted = showCascade.bookingsDeleted;
      showsDeleted = showCascade.showsDeleted;
    }

    const leftoverBookings = await Booking.deleteMany(
      { movieId: { $in: movieIds } },
      session ? { session } : {}
    );
    bookingsDeleted += leftoverBookings.deletedCount || 0;

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
  });
}

async function cascadeDeleteTheaters(theaterIds) {
  if (!theaterIds.length) {
    return {
      theatersDeleted: 0,
      showsDeleted: 0,
      seatsDeleted: 0,
      bookingsDeleted: 0,
    };
  }

  // Movies are independent — never deleted here.
  // Only shows on these screens → seats → bookings are removed.
  return withOptionalTransaction(async (session) => {
    const showQuery = Show.find({ theaterId: { $in: theaterIds } }).select('_id');
    if (session) showQuery.session(session);
    const shows = await showQuery.lean();
    const showIds = shows.map((s) => s._id);

    const showCascade = await cascadeDeleteShows(showIds, session);

    const theaterRes = await Theater.deleteMany(
      { _id: { $in: theaterIds } },
      session ? { session } : {}
    );

    return {
      theatersDeleted: theaterRes.deletedCount || 0,
      ...showCascade,
    };
  });
}

async function idsToDelete(Model, maxKeep) {
  const total = await Model.countDocuments();
  if (total <= maxKeep) {
    return { total, deleteIds: [], deletedLabels: [] };
  }

  const keepIds = await Model.find()
    .sort({ createdAt: -1 })
    .limit(maxKeep)
    .select('_id')
    .lean();
  const keepIdSet = keepIds.map((m) => m._id);

  const toDelete = await Model.find({ _id: { $nin: keepIdSet } })
    .select('_id title name')
    .lean();

  return {
    total,
    deleteIds: toDelete.map((d) => d._id),
    deletedLabels: toDelete.map((d) => d.title || d.name || String(d._id)),
  };
}

/**
 * Pick screens to remove without discarding a shared screen that remaining
 * shows still use (movies and screens are separate).
 * Prefer deleting unused screens first, then oldest in-use screens if still over max.
 */
async function pickTheatersToDelete(maxKeep) {
  const total = await Theater.countDocuments();
  if (total <= maxKeep) {
    return { total, deleteIds: [], deletedLabels: [] };
  }

  const usedRaw = await Show.distinct('theaterId', {
    theaterId: { $ne: null },
  });
  const usedSet = new Set(usedRaw.filter(Boolean).map((id) => String(id)));

  const all = await Theater.find()
    .sort({ createdAt: -1 })
    .select('_id name')
    .lean();

  const used = all.filter((t) => usedSet.has(String(t._id)));
  const unused = all.filter((t) => !usedSet.has(String(t._id)));

  const keep = [];
  if (used.length >= maxKeep) {
    keep.push(...used.slice(0, maxKeep));
  } else {
    keep.push(...used);
    keep.push(...unused.slice(0, maxKeep - used.length));
  }

  const keepSet = new Set(keep.map((t) => String(t._id)));
  const toDelete = all.filter((t) => !keepSet.has(String(t._id)));

  return {
    total,
    deleteIds: toDelete.map((t) => t._id),
    deletedLabels: toDelete.map((t) => t.name || String(t._id)),
  };
}

/**
 * After a new movie is added, if total > MAX_MOVIES, delete the oldest
 * movies (by createdAt) with all related shows, seats, and bookings.
 * Screens are never removed by this step.
 */
async function enforceMaxMovies() {
  const { total, deleteIds, deletedLabels } = await idsToDelete(Movie, MAX_MOVIES);
  if (!deleteIds.length) {
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

  logger.info('Max movies exceeded — removing oldest movies (screens kept)', {
    total,
    max: MAX_MOVIES,
    deleting: deletedLabels,
  });

  const result = await cascadeDeleteMovies(deleteIds);

  return {
    enforced: true,
    moviesBefore: total,
    moviesRetained: MAX_MOVIES,
    deletedTitles: deletedLabels,
    ...result,
  };
}

async function enforceMaxShows() {
  const { total, deleteIds, deletedLabels } = await idsToDelete(Show, MAX_SHOWS);
  if (!deleteIds.length) {
    return {
      enforced: false,
      showsBefore: total,
      showsRetained: total,
      showsDeleted: 0,
      seatsDeleted: 0,
      bookingsDeleted: 0,
      deletedLabels: [],
    };
  }

  logger.info('Max shows exceeded — removing oldest shows', {
    total,
    max: MAX_SHOWS,
    deleting: deleteIds.map(String),
  });

  const result = await withOptionalTransaction((session) =>
    cascadeDeleteShows(deleteIds, session)
  );

  return {
    enforced: true,
    showsBefore: total,
    showsRetained: MAX_SHOWS,
    deletedLabels,
    ...result,
  };
}

async function enforceMaxTheaters() {
  const { total, deleteIds, deletedLabels } = await pickTheatersToDelete(MAX_THEATERS);
  if (!deleteIds.length) {
    return {
      enforced: false,
      theatersBefore: total,
      theatersRetained: total,
      theatersDeleted: 0,
      showsDeleted: 0,
      seatsDeleted: 0,
      bookingsDeleted: 0,
      deletedLabels: [],
    };
  }

  logger.info('Max screens exceeded — removing excess screens (movies kept)', {
    total,
    max: MAX_THEATERS,
    deleting: deletedLabels,
  });

  const result = await cascadeDeleteTheaters(deleteIds);

  return {
    enforced: true,
    theatersBefore: total,
    theatersRetained: MAX_THEATERS,
    deletedLabels,
    ...result,
  };
}

/**
 * One-shot DB trim (movies / shows / screens are separate caps).
 *
 * Order:
 * 1) Movies → remove oldest movies + their shows/bookings (screens untouched)
 * 2) Shows → keep newest 5 shows among remaining
 * 3) Screens → keep up to 5; prefer screens still used by remaining shows
 *
 * Example: 10 movies on 1 shared screen → after reset: 5 movies, same 1 screen kept.
 */
async function resetCatalogData() {
  logger.info('Catalog reset started', {
    maxMovies: MAX_MOVIES,
    maxShows: MAX_SHOWS,
    maxTheaters: MAX_THEATERS,
  });

  const [moviesBefore, theatersBefore, showsBefore] = await Promise.all([
    Movie.countDocuments(),
    Theater.countDocuments(),
    Show.countDocuments(),
  ]);

  const movies = await enforceMaxMovies();
  const shows = await enforceMaxShows();
  const theaters = await enforceMaxTheaters();

  const [moviesAfter, theatersAfter, showsAfter] = await Promise.all([
    Movie.countDocuments(),
    Theater.countDocuments(),
    Show.countDocuments(),
  ]);

  const summary = {
    keepLimit: MAX_MOVIES,
    movies: {
      before: moviesBefore,
      kept: moviesAfter,
      deleted: movies.moviesDeleted || 0,
      removedTitles: movies.deletedTitles || [],
    },
    screens: {
      before: theatersBefore,
      kept: theatersAfter,
      deleted: theaters.theatersDeleted || 0,
      removedNames: theaters.deletedLabels || [],
    },
    shows: {
      before: showsBefore,
      kept: showsAfter,
      deleted:
        (movies.showsDeleted || 0) +
        (shows.showsDeleted || 0) +
        (theaters.showsDeleted || 0),
    },
    seatsDeleted:
      (movies.seatsDeleted || 0) +
      (shows.seatsDeleted || 0) +
      (theaters.seatsDeleted || 0),
    bookingsDeleted:
      (movies.bookingsDeleted || 0) +
      (shows.bookingsDeleted || 0) +
      (theaters.bookingsDeleted || 0),
  };

  logger.info('Catalog reset finished', summary);
  return summary;
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
  enforceMaxShows,
  enforceMaxTheaters,
  resetCatalogData,
  cascadeDeleteMovies,
  cascadeDeleteShows,
  cascadeDeleteTheaters,
  getMovieDependencyCounts,
  MAX_MOVIES,
  MAX_SHOWS,
  MAX_THEATERS,
};
