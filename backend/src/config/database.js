const mysql = require('mysql2/promise');
const config = require('./env');

/**
 * All DATETIME values in this application are "wall-clock" times in the server's
 * local time zone. dateStrings keeps them as plain strings (no implicit JS Date
 * conversion) and the session time zone is aligned with Node's so NOW() agrees.
 */
function localOffset() {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const pad = (n) => String(n).padStart(2, '0');
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  charset: 'utf8mb4',
});

const offset = localOffset();
pool.on('connection', (connection) => {
  connection.query('SET time_zone = ?', [offset]);
});

/**
 * Run a parameterised query. Values are always passed separately from the SQL
 * text (never concatenated), which prevents SQL injection.
 * Pass a transaction connection as the third argument to run inside a transaction.
 * Returns rows for SELECT and a ResultSetHeader (insertId, affectedRows) for writes.
 */
async function query(sql, params = [], connection = pool) {
  const [result] = await connection.query(sql, params);
  return result;
}

const ISOLATION_LEVELS = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'];

/**
 * Run `work(connection)` inside a transaction; commits on success, rolls back on error.
 * `isolationLevel` (optional) applies to this transaction only. MySQL's default,
 * REPEATABLE READ, fixes the data a transaction can see at its first plain SELECT, which
 * is not what a "lock, then check for conflicts" flow needs (see reservationService.js).
 */
async function withTransaction(work, { isolationLevel } = {}) {
  if (isolationLevel && !ISOLATION_LEVELS.includes(isolationLevel)) {
    throw new Error(`Unsupported isolation level: ${isolationLevel}`);
  }
  const connection = await pool.getConnection();
  try {
    if (isolationLevel) await connection.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function testConnection() {
  await pool.query('SELECT 1');
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, testConnection, closePool };
