require('../config/env');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Theater = require('../models/Theater');
const { createSeatsForShow } = require('../services/seatService');
const { buildTheaterLayout } = require('../utils/generateSeats');
const env = require('../config/env');
const logger = require('../utils/logger');

if (env.nodeEnv === 'production') {
  console.error('Refusing to run demo seed in production');
  process.exit(1);
}

const sampleMovies = [
  {
    title: 'Neon Horizons',
    description: 'A courier races across a glowing megacity to deliver a message that could restart the grid.',
    posterImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
    durationMinutes: 132,
    language: 'English',
    genre: 'Sci-Fi',
    releaseDate: '2026-08-15',
    price: 250,
    status: 'now_showing',
  },
  {
    title: 'Monsoon Letters',
    description: 'Two strangers exchange handwritten notes across a flooded coastal town.',
    posterImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80',
    durationMinutes: 118,
    language: 'Hindi',
    genre: 'Drama',
    releaseDate: '2026-09-01',
    price: 200,
    status: 'now_showing',
  },
  {
    title: 'Quiet Thunder',
    description: 'A retired detective confronts an old case when a storm isolates her mountain village.',
    posterImage: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
    durationMinutes: 140,
    language: 'English',
    genre: 'Thriller',
    releaseDate: '2026-09-20',
    price: 280,
    status: 'upcoming',
  },
  {
    title: 'Spice Route',
    description: 'A chef rediscovers family recipes while competing in a national cook-off.',
    posterImage: 'https://images.unsplash.com/photo-1517604931441-7018b65e90bb?w=600&q=80',
    durationMinutes: 125,
    language: 'Hindi',
    genre: 'Comedy',
    releaseDate: '2026-07-10',
    price: 180,
    status: 'now_showing',
  },
  {
    title: 'Orbit Kids',
    description: 'Young cadets train for the first civilian mission beyond the Moon.',
    posterImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
    durationMinutes: 105,
    language: 'English',
    genre: 'Adventure',
    releaseDate: '2026-10-05',
    price: 220,
    status: 'upcoming',
  },
  {
    title: 'Red Clay Stories',
    description: 'Generations of potters protect a village kiln from industrial takeover.',
    posterImage: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=600&q=80',
    durationMinutes: 150,
    language: 'Tamil',
    genre: 'Drama',
    releaseDate: '2026-06-01',
    price: 190,
    status: 'completed',
  },
  {
    title: 'Midnight Relay',
    description: 'A bike courier network races against a citywide blackout.',
    posterImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80',
    durationMinutes: 112,
    language: 'Hindi',
    genre: 'Action',
    releaseDate: '2026-08-28',
    price: 240,
    status: 'now_showing',
  },
  {
    title: 'Glass Garden',
    description: 'A botanist and an architect design a greenhouse that listens to its plants.',
    posterImage: 'https://images.unsplash.com/photo-1518676590629-3bfe737fb4c8?w=600&q=80',
    durationMinutes: 128,
    language: 'English',
    genre: 'Romance',
    releaseDate: '2026-09-12',
    price: 210,
    status: 'now_showing',
  },
];

const showTimes = [
  { start: '10:00', end: '12:30' },
  { start: '13:30', end: '16:00' },
  { start: '16:30', end: '19:00' },
  { start: '19:30', end: '22:00' },
];

async function seedDemo() {
  await connectDB();

  logger.info('Clearing existing demo collections...');
  await Promise.all([
    Booking.deleteMany({}),
    Seat.deleteMany({}),
    Show.deleteMany({}),
    Movie.deleteMany({}),
    Theater.deleteMany({}),
  ]);

  const email = env.adminEmail.toLowerCase().trim();
  let admin = await Admin.findOne({ email });
  if (!admin) {
    const passwordHash = await Admin.hashPassword(env.adminPassword);
    admin = await Admin.create({
      name: env.adminName,
      email,
      passwordHash,
      role: 'ADMIN',
    });
    logger.info(`Admin created: ${email}`);
  } else {
    logger.info(`Admin exists: ${email}`);
  }

  const movies = await Movie.insertMany(sampleMovies);
  logger.info(`Movies created: ${movies.length}`);

  const screenLayout = buildTheaterLayout(6, [10, 10, 10, 10, 10, 10]);
  const theater = await Theater.create({
    name: 'Screen 1',
    ...screenLayout,
  });
  logger.info(`Theater created: ${theater.name} (${theater.totalSeats} seats)`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let showCount = 0;
  for (const movie of movies.filter((m) => m.status !== 'completed').slice(0, 5)) {
    for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
      const showDate = new Date(today);
      showDate.setDate(showDate.getDate() + dayOffset);

      for (const t of showTimes.slice(0, dayOffset === 0 ? 3 : 2)) {
        const show = await Show.create({
          movieId: movie._id,
          theaterId: theater._id,
          showDate,
          startTime: t.start,
          endTime: t.end,
          totalSeats: theater.totalSeats,
          guestPrice: movie.price || 80,
          ownerPrice: 50,
          seatPrice: movie.price || 80,
          status: 'scheduled',
        });
        await createSeatsForShow(show._id, theater.rows);
        showCount += 1;
      }
    }
  }

  logger.info(`Shows created: ${showCount}`);
  logger.info('Demo seed completed');
  logger.info(`Login with ${email} / (ADMIN_PASSWORD from .env)`);

  await mongoose.connection.close();
}

seedDemo().catch(async (err) => {
  logger.error('seed failed', { message: err.message, stack: err.stack });
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
