const Show = require('../models/Show');
const Booking = require('../models/Booking');
const { getSeatsByShow, getSeatStats } = require('../services/seatService');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

const getShowSeats = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.showId).lean();
  if (!show) throw new AppError('Show not found', 404, 'NOT_FOUND');

  const [rawSeats, stats] = await Promise.all([
    getSeatsByShow(show._id),
    getSeatStats(show._id),
  ]);

  const bookingIds = [
    ...new Set(
      rawSeats
        .filter((s) => s.bookingId)
        .map((s) => String(s.bookingId))
    ),
  ];

  const bookings =
    bookingIds.length > 0
      ? await Booking.find({ _id: { $in: bookingIds } })
          .select('checkInStatus bookingNumber customerName')
          .lean()
      : [];

  const byBooking = new Map(bookings.map((b) => [String(b._id), b]));

  let allottedSeats = 0;
  let pendingAllotSeats = 0;

  const seats = rawSeats.map((seat) => {
    if (seat.status !== 'BOOKED' || !seat.bookingId) {
      return {
        ...seat,
        checkInStatus: null,
        bookingNumber: null,
      };
    }
    const booking = byBooking.get(String(seat.bookingId));
    const checkInStatus = booking?.checkInStatus || 'PENDING';
    if (checkInStatus === 'CHECKED_IN') allottedSeats += 1;
    else pendingAllotSeats += 1;
    return {
      ...seat,
      checkInStatus,
      bookingNumber: booking?.bookingNumber || null,
    };
  });

  res.json({
    success: true,
    message: 'Seats fetched',
    data: {
      show,
      seats,
      stats: {
        ...stats,
        allottedSeats,
        pendingAllotSeats,
      },
    },
  });
});

module.exports = { getShowSeats };
