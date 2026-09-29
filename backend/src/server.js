const app = require('./app');
const config = require('./config/env');
const { testConnection, closePool } = require('./config/database');
const reservationService = require('./services/reservationService');

const STATUS_REFRESH_MS = 60 * 1000;

async function start() {
  try {
    await testConnection();
    console.log(`Connected to MySQL database "${config.db.name}" on ${config.db.host}:${config.db.port}`);
  } catch (error) {
    console.error(`Could not connect to the database: ${error.message}`);
    console.error('Check the DB_* values in backend/.env and make sure the schema exists (npm run db:init).');
    process.exit(1);
  }

  // Keep reservation statuses in step with the clock (RESERVED -> ACTIVE -> COMPLETED).
  const refresh = () => reservationService.refreshStatuses().catch((error) => console.error('Status refresh failed:', error.message));
  await refresh();
  const timer = setInterval(refresh, STATUS_REFRESH_MS);
  timer.unref();

  const server = app.listen(config.port, () => {
    console.log(`Smart Parking API listening on http://localhost:${config.port}/api (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    clearInterval(timer);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
