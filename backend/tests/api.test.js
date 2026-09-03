process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_cinedesk';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cinema_test_unused';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const bcrypt = require('bcryptjs');

let mongo;
let app;
let Admin;
let Movie;
let Show;
let Seat;
let Booking;
let token;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await mongoose.connect(process.env.MONGODB_URI);

  app = require('../src/app');
  Admin = require('../src/models/Admin');
  Movie = require('../src/models/Movie');
  Show = require('../src/models/Show');
  Seat = require('../src/models/Seat');
  Booking = require('../src/models/Booking');

  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await Admin.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    passwordHash,
    role: 'ADMIN',
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@123' });

  token = loginRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    Movie.deleteMany({}),
    Show.deleteMany({}),
    Seat.deleteMany({}),
    Booking.deleteMany({}),
  ]);
});

async function createMovie(overrides = {}) {
  const res = await request(app)
    .post('/api/movies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Film',
      description: 'A test movie',
      posterImage: '',
      durationMinutes: 120,
      language: 'Hindi',
      genre: 'Action',
      releaseDate: '2026-09-10',
      price: 200,
      status: 'now_showing',
      ...overrides,
    });
  return res;
}

async function createShow(movieId, overrides = {}) {
  const res = await request(app)
    .post('/api/shows')
    .set('Authorization', `Bearer ${token}`)
    .send({
      movieId,
      showDate: '2026-09-10',
      startTime: '19:30',
      endTime: '21:45',
      totalSeats: 20,
      seatPrice: 200,
      status: 'scheduled',
      ...overrides,
    });
  return res;
}

describe('Auth', () => {
  test('admin login succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });

  test('unauthorized access is blocked', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(401);
  });
});

describe('Movies', () => {
  test('CRUD works', async () => {
    const created = await createMovie({ title: 'Avatar Test' });
    expect(created.status).toBe(201);
    const id = created.body.data._id;

    const listed = await request(app)
      .get('/api/movies')
      .set('Authorization', `Bearer ${token}`);
    expect(listed.body.data.length).toBe(1);

    const updated = await request(app)
      .put(`/api/movies/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Avatar Updated' });
    expect(updated.body.data.title).toBe('Avatar Updated');

    const deleted = await request(app)
      .delete(`/api/movies/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
  });
});

describe('Shows & seats', () => {
  test('creates show and generates seats', async () => {
    const movie = await createMovie();
    const show = await createShow(movie.body.data._id, { totalSeats: 24 });
    expect(show.status).toBe(201);

    const seats = await request(app)
      .get(`/api/shows/${show.body.data._id}/seats`)
      .set('Authorization', `Bearer ${token}`);

    expect(seats.body.data.seats).toHaveLength(24);
    expect(seats.body.data.stats.available).toBe(24);
  });

  test('prevents duplicate show slot', async () => {
    const movie = await createMovie();
    await createShow(movie.body.data._id);
    const dup = await createShow(movie.body.data._id);
    expect(dup.status).toBe(409);
  });
});

describe('Bookings', () => {
  test('creates booking and calculates total on backend', async () => {
    const movie = await createMovie();
    const show = await createShow(movie.body.data._id);
    const showId = show.body.data._id;

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        showId,
        customerName: 'Rahul Sharma',
        mobileNumber: '9876543210',
        seats: ['A1', 'A2', 'A3'],
      });

    expect(booking.status).toBe(201);
    expect(booking.body.data.numberOfSeats).toBe(3);
    expect(booking.body.data.totalAmount).toBe(600);
    expect(booking.body.data.bookingNumber).toMatch(/^BK-\d{8}-\d{4}$/);

    const seats = await Seat.find({ showId, seatNumber: { $in: ['A1', 'A2', 'A3'] } });
    expect(seats.every((s) => s.status === 'BOOKED')).toBe(true);
  });

  test('prevents duplicate seat booking with 409', async () => {
    const movie = await createMovie();
    const show = await createShow(movie.body.data._id);
    const showId = show.body.data._id;

    const first = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        showId,
        customerName: 'First User',
        mobileNumber: '9876543210',
        seats: ['A1', 'A2'],
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        showId,
        customerName: 'Second User',
        mobileNumber: '9123456780',
        seats: ['A2', 'A3'],
      });
    expect(second.status).toBe(409);
    expect(second.body.errorCode).toBe('SEAT_ALREADY_BOOKED');
  });

  test('concurrent booking of same seat: only one succeeds', async () => {
    const movie = await createMovie();
    const show = await createShow(movie.body.data._id);
    const showId = show.body.data._id;

    const payloadA = {
      showId,
      customerName: 'User A',
      mobileNumber: '9876543210',
      seats: ['B1'],
    };
    const payloadB = {
      showId,
      customerName: 'User B',
      mobileNumber: '9123456780',
      seats: ['B1'],
    };

    const [resA, resB] = await Promise.all([
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send(payloadA),
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send(payloadB),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  test('cancel releases seats', async () => {
    const movie = await createMovie();
    const show = await createShow(movie.body.data._id);
    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        showId: show.body.data._id,
        customerName: 'Cancel Me',
        mobileNumber: '9876543210',
        seats: ['A1'],
      });

    const cancelled = await request(app)
      .patch(`/api/bookings/${booking.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancelled.status).toBe(200);

    const seat = await Seat.findOne({
      showId: show.body.data._id,
      seatNumber: 'A1',
    });
    expect(seat.status).toBe('AVAILABLE');
  });

  test('edit booking can change seats safely', async () => {
    const movie = await createMovie();
    const show = await createShow(movie.body.data._id);
    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        showId: show.body.data._id,
        customerName: 'Edit Me',
        mobileNumber: '9876543210',
        seats: ['A1', 'A2'],
      });

    const updated = await request(app)
      .put(`/api/bookings/${booking.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Edited Name',
        seats: ['B1', 'B2', 'B3'],
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.customerName).toBe('Edited Name');
    expect(updated.body.data.totalAmount).toBe(600);

    const a1 = await Seat.findOne({ showId: show.body.data._id, seatNumber: 'A1' });
    const b1 = await Seat.findOne({ showId: show.body.data._id, seatNumber: 'B1' });
    expect(a1.status).toBe('AVAILABLE');
    expect(b1.status).toBe('BOOKED');
  });
});

describe('Movie limit', () => {
  test('adding 11th movie deletes oldest with shows/seats/bookings', async () => {
    const movies = [];
    for (let i = 0; i < 10; i += 1) {
      const m = await Movie.create({
        title: `Movie ${i}`,
        description: 'x',
        price: 100,
        status: 'now_showing',
      });
      await Movie.collection.updateOne(
        { _id: m._id },
        { $set: { createdAt: new Date(Date.now() - (10 - i) * 60_000) } }
      );
      movies.push(m);
    }

    const old = movies[0];
    const show = await Show.create({
      movieId: old._id,
      showDate: new Date(),
      startTime: '10:00',
      endTime: '12:00',
      totalSeats: 10,
      seatPrice: 100,
      status: 'scheduled',
    });
    await Seat.create({
      showId: show._id,
      seatNumber: 'A1',
      row: 'A',
      column: 1,
      status: 'AVAILABLE',
    });
    await Booking.create({
      bookingNumber: 'BK-20260101-0001',
      movieId: old._id,
      showId: show._id,
      customerName: 'Old',
      mobileNumber: '9876543210',
      seats: [{ seatNumber: 'A1' }],
      seatPrice: 100,
      numberOfSeats: 1,
      totalAmount: 100,
      bookingStatus: 'CONFIRMED',
    });

    const created = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Brand New Movie',
        description: 'newest',
        price: 250,
      });

    expect(created.status).toBe(201);
    expect(created.body.meta.autoRemoved).toBe(true);
    expect(created.body.meta.removedMovies).toContain('Movie 0');
    expect(await Movie.countDocuments()).toBe(10);
    expect(await Movie.findById(old._id)).toBeNull();
    expect(await Show.countDocuments({ movieId: old._id })).toBe(0);
    expect(await Seat.countDocuments({ showId: show._id })).toBe(0);
    expect(await Booking.countDocuments({ movieId: old._id })).toBe(0);
    expect(await Movie.findOne({ title: 'Brand New Movie' })).toBeTruthy();
  });
});
