require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'smart_parking_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 50,
  seed: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@smartparking.local',
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
    customerEmail: process.env.DEMO_CUSTOMER_EMAIL || 'customer@smartparking.local',
    customerPassword: process.env.DEMO_CUSTOMER_PASSWORD || 'Customer@12345',
  },
};

if (!config.jwt.secret) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a long random value.');
}
if (config.env === 'production' && config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

module.exports = config;
