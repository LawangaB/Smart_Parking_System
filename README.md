# Smart Parking Management System

A full-stack web app for reserving parking bays: customers search a location, pick a bay
on a live plan, and book it; administrators manage locations, bays, fees, users and
reservations from a dashboard.

- **Backend**: Node.js, Express, MySQL (mysql2), JWT auth — `backend/`
- **Frontend**: React (Vite), React Router — `frontend/`
- **Database**: MySQL/MariaDB, schema in `database/schema.sql`

Project specs this was built from are not included in this archive; see the conversation
for `project-scope.md`, `requirements.md`, `architecture.md`, `database.md`, `backend.md`,
`api.md`, `frontend.md`, `ui-pages.md` and `implementation-plan.md` if you need them again.

## 1. Prerequisites

- Node.js 22 or later (the backend's `package.json` requires `>=22` for its test glob)
- A MySQL-compatible server (MySQL 8+ or MariaDB 10.6+) running and reachable

## 2. Set up the database and backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `DB_HOST`, `DB_USER` and `DB_PASSWORD` to a MySQL account that can
create databases. Then:

```bash
npm run db:init   # creates the database and tables from database/schema.sql
npm run db:seed   # adds demo accounts, 3 locations, bays and fees (skips if data exists)
npm run dev        # starts the API on http://localhost:5000/api (nodemon, auto-reload)
```

Demo accounts created by the seed script (change these in `.env` before seeding if you
want different ones):

| Role     | Email                          | Password        |
|----------|---------------------------------|-----------------|
| Admin    | admin@smartparking.local        | Admin@12345     |
| Customer | customer@smartparking.local     | Customer@12345  |

Run the backend test suite (spins up a separate `smart_parking_test` database, safe to
run anytime):

```bash
npm test   # 72 tests: unit tests + full API integration tests, incl. concurrency/race tests
```

## 3. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env   # defaults already point at http://localhost:5000/api
npm run dev             # starts the app on http://localhost:5173
```

Log in with either demo account above. Run the frontend tests with:

```bash
npm test   # vitest: utility and component tests
```

Build a production bundle with `npm run build` (outputs to `frontend/dist/`); preview it
locally with `npm run preview`.

## 4. Project layout

```
backend/
  src/
    config/        env loading, MySQL pool + transaction helper
    controllers/    request handlers
    services/       business logic (e.g. reservation creation, conflict checking)
    models/         SQL queries
    routes/         Express routers
    middleware/      auth, error handling, rate limiting
    validators/      request validation
    utils/           fee calculation, date/time parsing, errors, pagination
    scripts/         db:init and db:seed
  tests/
    api.test.js       integration tests against a live (test) database
    unit/             pure-function unit tests
    helpers/testApp.js  test harness (resets the test DB, boots the app on a random port)

database/
  schema.sql       6 tables: users, vehicles, parking_locations, parking_slots,
                    parking_fees, reservations

frontend/
  src/
    pages/           route-level screens (public, customer/, admin/)
    components/       shared UI (forms, modal, parking plan, tickets, vehicle cards, ...)
    services/         thin wrappers over the backend API
    context/           auth, toast notifications, shared booking draft
    hooks/             useAsync, useDebouncedValue
    utils/             date/money formatting, client-side validation mirroring the backend
    styles/             the design system (see below)
```

## 5. Notable implementation details

- **Double-booking is prevented at the database level, not just in the UI.** Creating a
  reservation locks the vehicle row and then the slot row (`SELECT ... FOR UPDATE`, always
  in that order to avoid deadlocks) inside a `READ COMMITTED` transaction, so two
  simultaneous requests for the same bay — or the same vehicle in two different bays — are
  serialized and only one can succeed. This is covered by concurrency tests in
  `backend/tests/api.test.js`, including a 12-way simultaneous-request stress test.
- **Fees are time-boxed and versioned**: each location/vehicle-type combination can have a
  fee record with an `effectiveFrom`/`effectiveTo` window, so changing a rate never alters
  the price of a past or already-confirmed reservation.
- **The frontend's visual design is grounded in real car-park signage**: the entrance
  board, the painted bay grid (bays are drawn with a 3-sided "paint" border, open on the
  entry side), the ticket-stub reservation card, and the number-plate vehicle card are all
  literal references to physical car-park furniture, not decoration. Barlow / Barlow
  Condensed were chosen because that typeface was originally drawn from California license
  plates and highway signage. The plan is written out at the top of
  `frontend/src/styles/tokens.css`.
- Every client-side validation rule (password rules, registration number format, money
  fields, booking-window limits) mirrors a server-side rule of the same name — the server
  is always the source of truth; the client checks exist only for instant feedback.

## 6. Troubleshooting

- **`ECONNREFUSED` from `db:init`/`db:seed`/`npm run dev`**: the database server isn't
  running, or `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD` in `backend/.env` don't match it.
- **Frontend requests fail with a network error**: make sure the backend is running on the
  URL in `frontend/.env` (`VITE_API_URL`), and that `CORS_ORIGIN` in `backend/.env` matches
  the URL you're loading the frontend from (`http://localhost:5173` by default — note that
  `localhost` and `127.0.0.1` count as different origins to the browser).
- **`npm test` in the backend fails to find `tests/**/*.test.js`**: this glob pattern needs
  Node.js 22+; on an older Node version, run `node --test --test-concurrency=1 tests/api.test.js tests/unit/*.test.js` directly.
