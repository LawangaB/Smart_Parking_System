/**
 * Loads demo data so the application is usable straight away.
 * Usage: npm run db:seed   (run `npm run db:init` first)
 *
 * Creates (only if they do not exist yet):
 *   - an ADMIN account and a CUSTOMER account (credentials come from .env)
 *   - one demo vehicle for the customer
 *   - three parking locations with slots and current fees
 *
 * Development only: it refuses to run when NODE_ENV=production.
 */
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { closePool } = require('../config/database');
const userModel = require('../models/userModel');
const vehicleModel = require('../models/vehicleModel');
const locationModel = require('../models/locationModel');
const slotModel = require('../models/slotModel');
const feeModel = require('../models/feeModel');
const { toSqlDateTime } = require('../utils/dateTime');
const { ROLES } = require('../utils/constants');

const BCRYPT_ROUNDS = 10;

const DEMO_LOCATIONS = [
  {
    name: 'Central Plaza Parking',
    address: '12 Main Street, City Centre',
    description: 'Covered multi-storey car park next to the main shopping district.',
    operatingHours: '06:00 - 23:00',
    contactNumber: '+1 555 0101',
    slots: [
      { prefix: 'A', type: 'CAR', count: 20 },
      { prefix: 'M', type: 'MOTORCYCLE', count: 8 },
    ],
    fees: [
      { vehicleType: 'CAR', hourlyRate: 3.0, dailyRate: 20.0 },
      { vehicleType: 'MOTORCYCLE', hourlyRate: 1.0, dailyRate: 6.0 },
    ],
  },
  {
    name: 'Riverside Mall Garage',
    address: '48 Riverside Avenue',
    description: 'Large garage with wide bays for vans, attached to the mall.',
    operatingHours: '24 hours',
    contactNumber: '+1 555 0102',
    slots: [
      { prefix: 'B', type: 'CAR', count: 30 },
      { prefix: 'V', type: 'VAN', count: 6 },
    ],
    fees: [
      { vehicleType: 'CAR', hourlyRate: 2.5, dailyRate: 16.0 },
      { vehicleType: 'VAN', hourlyRate: 4.0, dailyRate: 26.0 },
    ],
  },
  {
    name: 'Airport Long-Stay Lot',
    address: 'Airport Road, Terminal Zone',
    description: 'Open-air long-stay parking with a shuttle to the terminal every 15 minutes.',
    operatingHours: '24 hours',
    contactNumber: '+1 555 0103',
    slots: [
      { prefix: 'C', type: 'CAR', count: 25 },
      { prefix: 'T', type: 'TRUCK', count: 5 },
    ],
    fees: [
      { vehicleType: 'CAR', hourlyRate: 1.5, dailyRate: 10.0 },
      { vehicleType: 'TRUCK', hourlyRate: 5.0, dailyRate: 32.0 },
    ],
  },
];

async function ensureUser({ fullName, email, password, phone, role }) {
  const existing = await userModel.findAuthByEmail(email.toLowerCase());
  if (existing) {
    console.log(`  - ${role} ${email} already exists`);
    return existing.user;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await userModel.create({ fullName, email: email.toLowerCase(), passwordHash, phone, role });
  console.log(`  + created ${role} ${email}`);
  return user;
}

async function seedParking() {
  if ((await locationModel.count()) > 0) {
    console.log('  - parking locations already exist, skipping locations, slots and fees');
    return;
  }

  // Fees are valid from yesterday so they apply to reservations starting right now.
  const effectiveFrom = toSqlDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000));

  for (const item of DEMO_LOCATIONS) {
    const location = await locationModel.create({
      name: item.name,
      address: item.address,
      description: item.description,
      operatingHours: item.operatingHours,
      contactNumber: item.contactNumber,
      status: 'ACTIVE',
    });

    let slotTotal = 0;
    for (const group of item.slots) {
      const slots = Array.from({ length: group.count }, (_, index) => ({
        slotNumber: `${group.prefix}${String(index + 1).padStart(2, '0')}`,
        slotType: group.type,
      }));
      slotTotal += await slotModel.createMany(location.locationId, slots, 'AVAILABLE');
    }

    for (const fee of item.fees) {
      await feeModel.create({
        locationId: location.locationId,
        vehicleType: fee.vehicleType,
        hourlyRate: fee.hourlyRate,
        dailyRate: fee.dailyRate,
        effectiveFrom,
        effectiveTo: null,
        status: 'ACTIVE',
      });
    }

    console.log(`  + created location "${item.name}" with ${slotTotal} slots and ${item.fees.length} fees`);
  }
}

async function main() {
  if (config.env === 'production') {
    throw new Error('Refusing to seed demo data while NODE_ENV=production.');
  }

  console.log('Seeding demo data...');

  await ensureUser({
    fullName: 'System Administrator',
    email: config.seed.adminEmail,
    password: config.seed.adminPassword,
    phone: null,
    role: ROLES.ADMIN,
  });

  const customer = await ensureUser({
    fullName: 'Demo Customer',
    email: config.seed.customerEmail,
    password: config.seed.customerPassword,
    phone: '+1 555 0100',
    role: ROLES.CUSTOMER,
  });

  if (!(await vehicleModel.findByRegistration('DEMO-1234'))) {
    await vehicleModel.create({
      userId: customer.userId,
      registrationNumber: 'DEMO-1234',
      vehicleType: 'CAR',
      makeModel: 'Toyota Corolla',
      color: 'Silver',
    });
    console.log('  + created demo vehicle DEMO-1234');
  }

  await seedParking();

  console.log('\nDone. Sign in with:');
  console.log(`  Admin:    ${config.seed.adminEmail} / ${config.seed.adminPassword}`);
  console.log(`  Customer: ${config.seed.customerEmail} / ${config.seed.customerPassword}`);
}

main()
  .catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closePool);
