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
    seatPrice: {
      type: Number,
      required: true,
      min: 0,
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

module.exports = mongoose.model('Show', showSchema);
module.exports.SHOW_STATUSES = SHOW_STATUSES;
