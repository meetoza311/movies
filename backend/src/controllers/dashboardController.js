const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { getSeatStats } = require('../services/seatService');
const { asyncHandler } = require('../middleware/errorMiddleware');

const SHOW_STATUSES = new Set(['scheduled', 'completed', 'cancelled']);

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function normalizeStatus(value) {
  const s = String(value || '').trim().toLowerCase();
  return SHOW_STATUSES.has(s) ? s : '';
}

function formatShowLabel(movieTitle, show) {
  const date = show.showDate
    ? new Date(show.showDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';
  const status = String(show.status || 'scheduled').toUpperCase();
  return `${movieTitle || 'Movie'} · ${date} ${show.startTime || ''} (${status})`;
}

const getStats = asyncHandler(async (req, res) => {
  const movieId = toObjectId(req.query.movieId);
  const showId = toObjectId(req.query.showId);
  const status = normalizeStatus(req.query.status);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Scope shows used for seats / occupancy / movie cards
  const showScopeFilter = {};
  if (showId) showScopeFilter._id = showId;
  else {
    if (movieId) showScopeFilter.movieId = movieId;
    if (status) showScopeFilter.status = status;
  }

  const scopedShows = await Show.find(showScopeFilter).select('_id movieId status').lean();
  const scopedShowIds = scopedShows.map((s) => s._id);
  const scopedMovieIdList = [
    ...new Set(
      scopedShows
        .map((s) => s.movieId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));

  // Movie counts follow the active show/status filter
  let totalMoviesPromise;
  let upcomingMoviesPromise;
  if (showId || status) {
    totalMoviesPromise = Promise.resolve(scopedMovieIdList.length);
    upcomingMoviesPromise = scopedMovieIdList.length
      ? Movie.countDocuments({ _id: { $in: scopedMovieIdList }, status: 'upcoming' })
      : Promise.resolve(0);
  } else if (movieId) {
    totalMoviesPromise = Movie.countDocuments({ _id: movieId });
    upcomingMoviesPromise = Movie.countDocuments({ _id: movieId, status: 'upcoming' });
  } else {
    totalMoviesPromise = Movie.countDocuments();
    upcomingMoviesPromise = Movie.countDocuments({ status: 'upcoming' });
  }

  const bookingMatch = { bookingStatus: 'CONFIRMED' };
  if (showId) bookingMatch.showId = showId;
  else if (movieId) bookingMatch.movieId = movieId;
  // When filtering by show status only (no movie/show id), limit bookings to those shows
  else if (status) {
    bookingMatch.showId = {
      $in: scopedShowIds.length ? scopedShowIds : [new mongoose.Types.ObjectId()],
    };
  }

  const showTodayFilter = {
    showDate: { $gte: startOfToday, $lt: endOfToday },
  };
  if (showId) showTodayFilter._id = showId;
  else {
    if (movieId) showTodayFilter.movieId = movieId;
    if (status) showTodayFilter.status = status;
    else showTodayFilter.status = 'scheduled';
  }

  const seatMatch =
    showId || movieId || status
      ? { showId: { $in: scopedShowIds.length ? scopedShowIds : [new mongoose.Types.ObjectId()] } }
      : {};

  const [
    totalMovies,
    upcomingMovies,
    todaysShows,
    totalBookings,
    todaysBookings,
    revenueAgg,
    seatAgg,
    bookingsByDay,
    revenueByDay,
    moviePerformance,
    allMovies,
    allShows,
  ] = await Promise.all([
    totalMoviesPromise,
    upcomingMoviesPromise,
    Show.countDocuments(showTodayFilter),
    Booking.countDocuments(bookingMatch),
    Booking.countDocuments({
      ...bookingMatch,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    }),
    Booking.aggregate([
      { $match: bookingMatch },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Seat.aggregate([
      ...(Object.keys(seatMatch).length ? [{ $match: seatMatch }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          ...bookingMatch,
          createdAt: { $gte: weekAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      {
        $match: {
          ...bookingMatch,
          createdAt: { $gte: weekAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: bookingMatch },
      {
        $group: {
          _id: '$movieId',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          seats: { $sum: '$numberOfSeats' },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie',
        },
      },
      { $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          movieId: '$_id',
          title: '$movie.title',
          bookings: 1,
          revenue: 1,
          seats: 1,
        },
      },
    ]),
    // Dropdown: every movie
    Movie.find().select('_id title').sort({ title: 1 }).lean(),
    // Dropdown: every show (all statuses)
    Show.find()
      .populate('movieId', 'title')
      .sort({ showDate: -1, startTime: -1 })
      .lean(),
  ]);

  const seatMap = { available: 0, booked: 0 };
  for (const row of seatAgg) {
    if (row._id === 'AVAILABLE') seatMap.available = row.count;
    if (row._id === 'BOOKED') seatMap.booked = row.count;
  }

  // Movies & show seats list — include scheduled / completed / cancelled per filter
  const listShowFilter = {};
  if (showId) listShowFilter._id = showId;
  else {
    if (movieId) listShowFilter.movieId = movieId;
    if (status) listShowFilter.status = status;
  }

  const listShows = await Show.find(listShowFilter)
    .populate('movieId', 'title posterImage status language genre')
    .sort({ showDate: -1, startTime: -1 })
    .limit(60)
    .lean();

  const showsWithSeats = await Promise.all(
    listShows.map(async (show) => {
      const seats = await getSeatStats(show._id);
      const total = seats.total || show.totalSeats || 0;
      const booked = seats.booked || 0;
      const available = seats.available || 0;
      const fillPercent = total > 0 ? Math.round((booked / total) * 100) : 0;
      return {
        ...show,
        seats: { total, available, booked },
        fillPercent,
      };
    })
  );

  const movieMap = new Map();
  for (const show of showsWithSeats) {
    const movie = show.movieId;
    if (!movie || !movie._id) continue;
    const key = String(movie._id);
    if (!movieMap.has(key)) {
      movieMap.set(key, {
        movieId: movie._id,
        title: movie.title,
        posterImage: movie.posterImage,
        status: movie.status,
        language: movie.language,
        genre: movie.genre,
        shows: [],
      });
    }
    movieMap.get(key).shows.push({
      _id: show._id,
      showDate: show.showDate,
      startTime: show.startTime,
      endTime: show.endTime,
      seatPrice: show.guestPrice ?? show.seatPrice,
      guestPrice: show.guestPrice ?? show.seatPrice ?? 80,
      ownerPrice: show.ownerPrice ?? 50,
      status: show.status,
      seats: show.seats,
      fillPercent: show.fillPercent,
    });
  }

  const movieShowOccupancy = Array.from(movieMap.values());

  const recentFilter = {};
  if (showId) recentFilter.showId = showId;
  else if (movieId) recentFilter.movieId = movieId;
  else if (status) {
    recentFilter.showId = {
      $in: scopedShowIds.length ? scopedShowIds : [new mongoose.Types.ObjectId()],
    };
  }

  const recentBookings = await Booking.find(recentFilter)
    .populate('movieId', 'title')
    .populate('showId', 'showDate startTime status')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const filterOptions = {
    movies: allMovies.map((m) => ({
      id: String(m._id),
      title: m.title,
    })),
    shows: allShows.map((s) => {
      const title = s.movieId?.title || 'Movie';
      return {
        id: String(s._id),
        movieId: String(s.movieId?._id || s.movieId || ''),
        status: s.status || 'scheduled',
        label: formatShowLabel(title, s),
      };
    }),
    statuses: [
      { id: '', label: 'All statuses' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'completed', label: 'Completed' },
      { id: 'cancelled', label: 'Cancelled' },
    ],
  };

  res.json({
    success: true,
    message: 'Dashboard stats',
    data: {
      filters: {
        movieId: movieId ? String(movieId) : '',
        showId: showId ? String(showId) : '',
        status: status || '',
      },
      filterOptions,
      cards: {
        totalMovies,
        upcomingMovies,
        todaysShows,
        totalBookings,
        todaysBookings,
        totalRevenue: revenueAgg[0]?.total || 0,
        availableSeats: seatMap.available,
        bookedSeats: seatMap.booked,
      },
      charts: {
        bookingsByDay: bookingsByDay.map((d) => ({ date: d._id, count: d.count })),
        revenueByDay: revenueByDay.map((d) => ({ date: d._id, revenue: d.revenue })),
        moviePerformance,
        seatOccupancy: {
          available: seatMap.available,
          booked: seatMap.booked,
        },
      },
      movieShowOccupancy,
      recentBookings,
    },
  });
});

module.exports = { getStats };
