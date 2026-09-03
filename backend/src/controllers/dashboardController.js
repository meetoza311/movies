const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { getSeatStats } = require('../services/seatService');
const { asyncHandler } = require('../middleware/errorMiddleware');

const getStats = asyncHandler(async (_req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const weekAhead = new Date(startOfToday);
  weekAhead.setDate(weekAhead.getDate() + 7);

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
  ] = await Promise.all([
    Movie.countDocuments(),
    Movie.countDocuments({ status: 'upcoming' }),
    Show.countDocuments({
      showDate: { $gte: startOfToday, $lt: endOfToday },
      status: 'scheduled',
    }),
    Booking.countDocuments({ bookingStatus: 'CONFIRMED' }),
    Booking.countDocuments({
      bookingStatus: 'CONFIRMED',
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    }),
    Booking.aggregate([
      { $match: { bookingStatus: 'CONFIRMED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Seat.aggregate([
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
          bookingStatus: 'CONFIRMED',
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
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
          bookingStatus: 'CONFIRMED',
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
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
      { $match: { bookingStatus: 'CONFIRMED' } },
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
  ]);

  const seatMap = { available: 0, booked: 0 };
  for (const row of seatAgg) {
    if (row._id === 'AVAILABLE') seatMap.available = row.count;
    if (row._id === 'BOOKED') seatMap.booked = row.count;
  }

  const upcomingShows = await Show.find({
    status: 'scheduled',
    showDate: { $gte: startOfToday, $lt: weekAhead },
  })
    .populate('movieId', 'title posterImage status language genre')
    .sort({ showDate: 1, startTime: 1 })
    .lean();

  const showsWithSeats = await Promise.all(
    upcomingShows.map(async (show) => {
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
      seatPrice: show.seatPrice,
      status: show.status,
      seats: show.seats,
      fillPercent: show.fillPercent,
    });
  }

  const movieShowOccupancy = Array.from(movieMap.values());

  const recentBookings = await Booking.find()
    .populate('movieId', 'title')
    .populate('showId', 'showDate startTime')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  res.json({
    success: true,
    message: 'Dashboard stats',
    data: {
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
