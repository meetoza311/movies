const mongoose = require('mongoose');

const BOOKING_STATUSES = ['CONFIRMED', 'CANCELLED'];

const bookingSeatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    seats: {
      type: [bookingSeatSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one seat is required',
      },
    },
    seatPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    bookingStatus: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'CONFIRMED',
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// bookingNumber already unique via schema field
bookingSchema.index({ mobileNumber: 1 });
bookingSchema.index({ showId: 1, bookingStatus: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ customerName: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
