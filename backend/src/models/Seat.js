const mongoose = require('mongoose');

const SEAT_STATUSES = ['AVAILABLE', 'BOOKED'];
const SEAT_CATEGORIES = ['GUEST', 'OWNER'];

const seatSchema = new mongoose.Schema(
  {
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
      index: true,
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    row: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    column: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: SEAT_STATUSES,
      default: 'AVAILABLE',
    },
    category: {
      type: String,
      enum: SEAT_CATEGORIES,
      default: undefined,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  { timestamps: true }
);

seatSchema.index({ showId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ showId: 1, status: 1 });

module.exports = mongoose.model('Seat', seatSchema);
module.exports.SEAT_STATUSES = SEAT_STATUSES;
module.exports.SEAT_CATEGORIES = SEAT_CATEGORIES;
