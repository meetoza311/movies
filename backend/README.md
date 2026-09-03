# Savan Sentosa — Backend API

Express + MongoDB API for the Savan Sentosa cinema admin system.

## Quick start

```bash
cp .env.example .env
npm install
npm run seed:admin
npm run dev
```

API runs at `http://localhost:5000`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Production start |
| `npm run seed:admin` | Create admin from `.env` |
| `npm run seed` | Demo data (dev only) |
| `npm test` | Jest tests |

## Env

See `.env.example` for `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, and admin credentials.

Full docs: [root README](../README.md)
