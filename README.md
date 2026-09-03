# CineDesk — Cinema Management System

Production-oriented **admin-only** cinema operations desk for managing movies, shows, seats, and walk-up bookings.

**Stack:** React + Vite · Node.js + Express · MongoDB + Mongoose · JWT auth · Tailwind CSS

This is **not** a BookMyShow clone. Branding, layout, and implementation are original.

---

## Features

- Admin login with JWT (no customer accounts in V1)
- Movie CRUD with search / filters
- Show timings with automatic seat generation (single price per show — no Gold/Silver tiers)
- Visual seat map with Available / Selected / Booked states
- Transaction-safe booking with atomic seat locking (409 on conflicts)
- Edit / cancel / permanently delete bookings
- Printable tickets with human-readable IDs (`BK-YYYYMMDD-0001`)
- Dashboard statistics and charts
- Max **10 movies**: adding an 11th auto-deletes the oldest movie with its shows, seats, and bookings (no cron)
- Backend tests for critical booking concurrency and movie limit cascade

---

## Project structure

```text
movies/
├── backend/     Express API
├── frontend/    React admin app
└── README.md
```

---

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas). Transactions work best on a replica set / Atlas; local standalone falls back to atomic seat updates.

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cinema_management
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
ADMIN_NAME=Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me
ENABLE_MOVIE_CLEANUP_CRON=true
```

Seed admin + demo data:

```bash
npm run seed:admin
npm run seed
```

Start API:

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with the seeded admin.

---

## Scripts

| Command | Where | Purpose |
| --- | --- | --- |
| `npm run dev` | backend / frontend | Development servers |
| `npm run seed:admin` | backend | Create admin from env |
| `npm run seed` | backend | Demo movies/shows (dev only) |
| `npm test` | backend | Jest API tests |
| `npm run build` | frontend | Production build |

---

## API overview

Base URL: `/api`

### Auth
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Movies
- `GET /movies`
- `GET /movies/:id`
- `GET /movies/:id/dependencies`
- `POST /movies`
- `PUT /movies/:id`
- `DELETE /movies/:id`

### Shows & seats
- `GET /shows`
- `GET /shows/:id`
- `POST /shows`
- `PUT /shows/:id`
- `DELETE /shows/:id`
- `GET /shows/:showId/seats`

### Bookings
- `GET /bookings`
- `GET /bookings/:id`
- `POST /bookings`
- `PUT /bookings/:id`
- `PATCH /bookings/:id/cancel`
- `DELETE /bookings/:id`

### Dashboard
- `GET /dashboard/stats`

All routes except login/health require `Authorization: Bearer <token>`.

Success responses:

```json
{ "success": true, "message": "...", "data": {} }
```

Seat conflicts return **409** with `errorCode: "SEAT_ALREADY_BOOKED"`.

---

## Business rules (highlights)

- Backend always recalculates `totalAmount = seatPrice × numberOfSeats`
- Seats are booked atomically; concurrent requests for the same seat cannot both succeed
- Cancel releases seats; permanent delete removes the record
- Movie delete warns about dependent shows/bookings and cascades on confirm
- **Max 10 movies**: when an 11th movie is added, the oldest movie is deleted immediately along with its shows, seats, and bookings

---

## Deployment

### Backend (Render)

- Root: `backend`
- Build: `npm install`
- Start: `npm start`
- Env: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`, admin seed vars

### Frontend (Vercel)

- Root: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://your-api-domain/api`

CORS is locked to `FRONTEND_URL` (not `*` in production).

### Database

Use MongoDB Atlas. Prefer a replica set (Atlas default) so booking transactions work.

---

## Testing

```bash
cd backend
npm test
```

Coverage includes login, unauthorized access, movie/show CRUD, seat generation, booking creation, duplicate seat prevention, concurrent booking race, cancel/edit, price calculation, and max-10 movie cascade delete.

---

## Security

- Passwords hashed with bcrypt
- JWT-protected API + React routes
- Helmet, CORS, login rate limiting
- Request validation
- Secrets only in backend env — never exposed to Vite
