/**
 * Test harness for the API integration tests.
 *
 * Uses a separate database (smart_parking_test) that is dropped and recreated from
 * database/schema.sql, so the development database is never touched. The connection
 * settings (host, user, password) still come from backend/.env.
 *
 * Load this file BEFORE requiring anything from src/.
 */
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'smart_parking_test';
process.env.JWT_SECRET = 'integration-test-secret-0123456789abcdef';
process.env.AUTH_RATE_LIMIT_MAX = '100000';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../../src/config/env');

const TEST_DB = 'smart_parking_test';
const SCHEMA_PATH = path.resolve(__dirname, '../../../database/schema.sql');

async function resetDatabase() {
  if (config.db.name !== TEST_DB) throw new Error(`Refusing to reset database "${config.db.name}".`);

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await connection.query(fs.readFileSync(SCHEMA_PATH, 'utf8').replace(/smart_parking_db/g, TEST_DB));
  } finally {
    await connection.end();
  }
}

/** Boots the Express app on a random port and returns a tiny JSON client. */
async function startApp() {
  const app = require('../../src/app');
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  async function api(method, url, { token, body } = {}) {
    const response = await fetch(baseUrl + url, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await response.json().catch(() => null);
    return { status: response.status, body: json };
  }

  return { api, server };
}

async function createAdmin(email = 'admin@test.local', password = 'Admin@12345') {
  const userModel = require('../../src/models/userModel');
  return userModel.create({
    fullName: 'Test Admin',
    email,
    passwordHash: bcrypt.hashSync(password, 4),
    role: 'ADMIN',
  });
}

/** "YYYY-MM-DDTHH:mm:00" for a moment `hours` from now, snapped to the start of that hour. */
function inHours(hours) {
  const { toSqlDateTime } = require('../../src/utils/dateTime');
  const date = new Date(Date.now() + hours * 3_600_000);
  date.setMinutes(0, 0, 0);
  return toSqlDateTime(date).replace(' ', 'T');
}

async function shutdown(server) {
  await new Promise((resolve) => server.close(resolve));
  await require('../../src/config/database').closePool();
}

module.exports = { resetDatabase, startApp, createAdmin, inHours, shutdown };
