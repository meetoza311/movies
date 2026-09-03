const mongoose = require('mongoose');

const SHOW_STATUSES = ['scheduled', 'completed', 'cancelled'];

const showSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theater',
      index: true,
    },
    showDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    /** @deprecated use guestPrice — kept for older bookings/UI */
    seatPrice: {
      type: Number,
      min: 0,
      default: 80,
    },
    ownerPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
    },
    guestPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 80,
    },
    status: {
      type: String,
      enum: SHOW_STATUSES,
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

showSchema.index({ movieId: 1, showDate: 1 });
showSchema.index({ showDate: 1, startTime: 1 });
showSchema.index(
  { movieId: 1, showDate: 1, startTime: 1 },
  { unique: true }
);

/** Normalize legacy shows that only have seatPrice */
showSchema.methods.getPrices = function getPrices() {
  const guest =
    this.guestPrice != null && !Number.isNaN(Number(this.guestPrice))
      ? Number(this.guestPrice)
      : Number(this.seatPrice) || 80;
  const owner =
    this.ownerPrice != null && !Number.isNaN(Number(this.ownerPrice))
      ? Number(this.ownerPrice)
      : 50;
  return { guestPrice: guest, ownerPrice: owner };
};

module.exports = mongoose.model('Show', showSchema);
module.exports.SHOW_STATUSES = SHOW_STATUSES;
