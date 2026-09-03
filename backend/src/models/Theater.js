const mongoose = require('mongoose');

const MAX_ROWS = 20;
const MAX_SEATS_PER_ROW = 20;

const rowSchema = new mongoose.Schema(
  {
    row: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_SEATS_PER_ROW,
    },
  },
  { _id: false }
);

const theaterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    rowCount: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_ROWS,
    },
    rows: {
      type: [rowSchema],
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

theaterSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Theater', theaterSchema);
module.exports.MAX_ROWS = MAX_ROWS;
module.exports.MAX_SEATS_PER_ROW = MAX_SEATS_PER_ROW;
