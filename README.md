# Ledger

Ledger is a full-stack FX research and simulation app built with React, TypeScript, Express, and PostgreSQL. It ships with demo personas, seeded market reference data, portfolio and simulation workflows, watchlists, notes, alerts, forecasts, and scheduled data sync jobs.

## Stack

- Frontend: React 18, TypeScript, Vite
- Backend: Express 5, TypeScript
- Database: PostgreSQL 16 via `pg`
- Testing: Vitest, Testing Library

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL:

```bash
npm run db:up
```

3. Start the app:

```bash
npm run dev
```

The web app runs through Vite and the API runs on `http://localhost:8787`.

## Useful scripts

- `npm run dev`: starts the API and Vite dev server together
- `npm run build`: production build for the frontend
- `npm run test`: runs the Vitest suite
- `npm run db:up`: starts PostgreSQL with Docker Compose
- `npm run db:down`: stops PostgreSQL
- `npm run db:seed`: recreates demo data, loads historical FX data, syncs latest FX/news/forecasts
- `npm run db:sync:latest`: refreshes latest FX rates
- `npm run db:sync:news`: refreshes news and events
- `npm run db:sync:forecast`: refreshes forecasts
- `npm run db:sync:all`: runs all sync jobs

## Environment

The API reads environment variables from `.env` if present. Defaults are defined in `server/lib/config.ts`.

Key variables:

- `API_PORT`: API port, default `8787`
- `DATABASE_URL`: PostgreSQL connection string, default `postgres://postgres:postgres@localhost:5432/sovereign_analytics`
- `SESSION_COOKIE_NAME`: cookie name for auth sessions
- `FX_SYNC_INTERVAL_MINUTES`: latest FX refresh interval
- `NEWS_SYNC_INTERVAL_MINUTES`: news refresh interval
- `FORECAST_SYNC_INTERVAL_MINUTES`: forecast refresh interval

## Database

Yes, there is an explicit schema file:

- Schema: `server/db/schema.sql`

The database is implemented with raw SQL and the `pg` driver. There is no ORM or migration framework in this repo.

Implementation flow:

- `server/lib/db.ts` creates the PostgreSQL pool and loads the schema with `ensureSchema()`
- `server/index.ts` calls `ensureSchema()` and `initializeDatabase()` during API startup
- `server/lib/seed.ts` seeds reference tables, demo users, portfolios, and syncs FX/news/forecast data
- `server/lib/bootstrap.ts` reads database rows and assembles the frontend bootstrap payload

### Schema design

The schema uses a hybrid model:

- Reference and activity tables store a `payload jsonb` document for the full domain object
- Frequently queried fields are duplicated into normal columns for filtering, ordering, foreign keys, and indexes
- Examples:
  - `simulations` stores `user_id`, `pair_id`, timestamps, and a full `payload`
  - `watchlist`, `alerts`, `notes`, and `portfolios` follow the same pattern
  - `pair_daily_rates` is more relational and stores time-series data in typed columns

Main tables:

- `users`, `user_sessions`, `user_visits`
- `currencies`, `pairs`, `events`, `news`, `forecasts`
- `strategies`, `scenarios`
- `portfolios`, `positions`, `orders`, `journals`
- `simulations`, `watchlist`, `alerts`, `notes`
- `pair_daily_rates`
- `admin_state`

### Important note

Some user preference fields exist twice:

- top-level columns such as `favorite_currencies`, `favorite_pairs`, `default_account_currency`, `dashboard_preset`
- the `settings jsonb` object on `users`

That duplication appears intentional so the app can keep a full settings document while also exposing easier-to-query columns. It does, however, create a consistency risk if future code updates one representation without updating the other.

## Project shape

- `src/`: React app, routes, UI, domain types, selectors, calculators
- `server/`: Express API, PostgreSQL access, seed logic, sync jobs
- `server/db/schema.sql`: database schema
- `server/scripts/`: manual database sync and seed entry points

## Current README status

This README now documents the actual application and removes the default Vite template content that was previously unrelated to the project.
