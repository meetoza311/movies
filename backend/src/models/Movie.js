const mongoose = require('mongoose');

const MOVIE_STATUSES = ['upcoming', 'now_showing', 'completed'];

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    posterImage: {
      type: String,
      trim: true,
      default: '',
    },
    // Kept optional for older records / seed data — not required in the admin form
    durationMinutes: {
      type: Number,
      min: 1,
      default: 120,
    },
    language: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    genre: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: MOVIE_STATUSES,
      default: 'now_showing',
    },
  },
  { timestamps: true }
);

movieSchema.index({ title: 1 });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ status: 1 });
movieSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Movie', movieSchema);
module.exports.MOVIE_STATUSES = MOVIE_STATUSES;
