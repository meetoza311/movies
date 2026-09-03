const mongoose = require('mongoose');

const BOOKING_STATUSES = ['CONFIRMED', 'CANCELLED'];
const SEAT_CATEGORIES = ['GUEST', 'OWNER'];

const bookingSeatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      enum: SEAT_CATEGORIES,
      default: 'GUEST',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
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
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    seats: {
      type: [bookingSeatSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one seat is required',
      },
    },
    /** Snapshot prices at booking time */
    guestPrice: {
      type: Number,
      min: 0,
      default: 80,
    },
    ownerPrice: {
      type: Number,
      min: 0,
      default: 50,
    },
    /** Legacy average / primary price for older clients */
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
    /** Unique QR / gate scan code */
    scanToken: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    checkInStatus: {
      type: String,
      enum: ['PENDING', 'CHECKED_IN'],
      default: 'PENDING',
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    checkInMethod: {
      type: String,
      enum: ['SCAN', 'MANUAL'],
      default: undefined,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ mobileNumber: 1 });
bookingSchema.index({ customerEmail: 1 });
bookingSchema.index({ showId: 1, bookingStatus: 1 });
bookingSchema.index({ showId: 1, checkInStatus: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ customerName: 1 });
bookingSchema.index({ bookingNumber: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
module.exports.SEAT_CATEGORIES = SEAT_CATEGORIES;
