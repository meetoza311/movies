# Savan Sentosa — Cinema Management System

Admin-only cinema desk for **Savan Sentosa**: manage movies, shows, seats, and walk-up bookings.

**Stack:** React + Vite · Node.js + Express · MongoDB + Mongoose · JWT · Tailwind CSS

---

## Features

- Admin login with JWT (no customer accounts)
- Movies: name, poster (upload or URL), description, price
- Max **10 movies** — adding an 11th deletes the oldest movie plus its shows, seats, and bookings
- Show timings with automatic seat layout (one price per show)
- Visual seat map (Available / Selected / Booked)
- Safe booking with duplicate-seat prevention (409 Conflict)
- Edit / cancel / permanently delete bookings
- Printable tickets (`BK-YYYYMMDD-0001`)
- Dashboard with movie-wise seat availability
- Mobile-friendly admin UI

---

## Project structure

```text
movies/
├── backend/      Express API
├── frontend/     React admin app
├── package.json
└── README.md
```

---

## Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
```

Configure `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
ADMIN_NAME=Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me
```

> On some Windows networks, `mongodb+srv://` DNS may fail. Use the standard `mongodb://host1,host2,host3/...` Atlas connection string instead.

Seed and start:

```bash
npm run seed:admin
npm run seed          # optional demo data (dev only)
npm run dev           # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

`.env`:

```env
VITE_API_URL=https://movies-pnmw.onrender.com/api
```

Login with the admin email/password from backend `.env` / Render.

---

## Scripts

| Command | Where | Purpose |
| --- | --- | --- |
| `npm run dev` | backend / frontend | Development servers |
| `npm run seed:admin` | backend | Create admin user |
| `npm run seed` | backend | Demo movies & shows (dev) |
| `npm test` | backend | API tests |
| `npm run build` | frontend | Production build |

---

## API overview

Base: `/api` · Auth header: `Authorization: Bearer <token>`

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Movies | `GET/POST /movies`, `GET/PUT/DELETE /movies/:id` |
| Shows | `GET/POST /shows`, `GET/PUT/DELETE /shows/:id` |
| Seats | `GET /shows/:showId/seats` |
| Bookings | `GET/POST /bookings`, `GET/PUT/DELETE /bookings/:id`, `PATCH /bookings/:id/cancel` |
| Dashboard | `GET /dashboard/stats` |

Response shape:

```json
{ "success": true, "message": "...", "data": {} }
```

Already-booked seats → **409** `SEAT_ALREADY_BOOKED`.

---

## Important rules

- Backend recalculates booking total: `seatPrice × numberOfSeats`
- Seat booking is atomic; concurrent same-seat requests cannot both succeed
- Cancel booking releases seats; permanent delete removes the record
- Max 10 movies; 11th create removes oldest movie + related data

---

## Deployment

**Backend (Render)**  
- Root: `backend` · Start: `npm start`  
- Env: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`, admin vars  

**Frontend (Vercel)**  
- Root: `frontend` · Build: `npm run build` · Output: `dist`  
- Env: `VITE_API_URL=https://movies-pnmw.onrender.com/api`  

CORS uses `FRONTEND_URL` only (not `*`).

---

## Security

- bcrypt password hashing  
- JWT-protected API and React routes  
- Helmet, CORS, login rate limit  
- Never commit real `.env` files  
