/**
 * Creates the database and all tables by running database/schema.sql.
 * Usage: npm run db:init
 *
 * Safe to run more than once: every statement uses IF NOT EXISTS.
 * The schema file names the database "smart_parking_db"; if DB_NAME in .env is
 * different, the name is swapped in before the script runs.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/env');

const SCHEMA_PATH = path.resolve(__dirname, '../../../database/schema.sql');
const DEFAULT_DB_NAME = 'smart_parking_db';

async function main() {
  if (!/^[A-Za-z0-9_]+$/.test(config.db.name)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores.');
  }

  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8').replace(new RegExp(DEFAULT_DB_NAME, 'g'), config.db.name);

  // Connect without a default database, because it may not exist yet.
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    console.log(`Database "${config.db.name}" is ready (schema applied from database/schema.sql).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Database initialisation failed: ${error.message}`);
  console.error('Check the DB_HOST, DB_PORT, DB_USER and DB_PASSWORD values in backend/.env.');
  process.exit(1);
});
