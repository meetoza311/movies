const Show = require('../models/Show');
const { getSeatsByShow, getSeatStats } = require('../services/seatService');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

const getShowSeats = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.showId).lean();
  if (!show) throw new AppError('Show not found', 404, 'NOT_FOUND');

  const [seats, stats] = await Promise.all([
    getSeatsByShow(show._id),
    getSeatStats(show._id),
  ]);

  res.json({
    success: true,
    message: 'Seats fetched',
    data: {
      show,
      seats,
      stats,
    },
  });
});

module.exports = { getShowSeats };
