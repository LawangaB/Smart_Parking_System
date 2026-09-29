const { resetDatabase, startApp, createAdmin, inHours, shutdown } = require('./helpers/testApp');
const test = require('node:test');
const assert = require('node:assert/strict');

const PASSWORD = 'Passw0rd123';

let api;
let server;
const ctx = {}; // shared state between the ordered tests below

test.before(async () => {
  await resetDatabase();
  ({ api, server } = await startApp());
  await createAdmin();
});

test.after(async () => {
  await shutdown(server);
});

async function registerCustomer(name, email) {
  const res = await api('POST', '/auth/register', { body: { fullName: name, email, password: PASSWORD, phone: '0771234567' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.data.token, user: res.body.data.user };
}

test.describe('health and routing', () => {
  test('GET /api/health', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ok');
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await api('GET', '/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('malformed JSON returns 400', async () => {
    const response = await fetch(`${server.address() ? `http://127.0.0.1:${server.address().port}` : ''}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    });
    assert.equal(response.status, 400);
  });
});

test.describe('authentication', () => {
  test('registers a customer and never returns the password hash', async () => {
    ctx.alice = await registerCustomer('Alice Perera', 'alice@test.local');
    assert.equal(ctx.alice.user.role, 'CUSTOMER');
    assert.equal(ctx.alice.user.email, 'alice@test.local');
    assert.equal(JSON.stringify(ctx.alice.user).includes('password'), false);
    ctx.bob = await registerCustomer('Bob Silva', 'bob@test.local');
  });

  test('rejects a duplicate email (case-insensitive) with 409', async () => {
    const res = await api('POST', '/auth/register', {
      body: { fullName: 'Alice Again', email: 'ALICE@test.local', password: PASSWORD },
    });
    assert.equal(res.status, 409);
  });

  test('validates registration input with field errors', async () => {
    const res = await api('POST', '/auth/register', { body: { fullName: 'A', email: 'not-an-email', password: 'short' } });
    assert.equal(res.status, 422);
    const fields = res.body.errors.map((e) => e.field);
    assert.ok(fields.includes('fullName') && fields.includes('email') && fields.includes('password'), fields.join(','));
  });

  test('cannot self-register as ADMIN', async () => {
    const res = await api('POST', '/auth/register', {
      body: { fullName: 'Mallory', email: 'mallory@test.local', password: PASSWORD, role: 'ADMIN' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'CUSTOMER');
  });

  test('logs in with correct credentials', async () => {
    const res = await api('POST', '/auth/login', { body: { email: 'alice@test.local', password: PASSWORD } });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
  });

  test('rejects a wrong password and an unknown email with the same 401 message', async () => {
    const wrong = await api('POST', '/auth/login', { body: { email: 'alice@test.local', password: 'Wrong-pass-1' } });
    const unknown = await api('POST', '/auth/login', { body: { email: 'nobody@test.local', password: 'Wrong-pass-1' } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  test('logs in as the admin', async () => {
    const res = await api('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'Admin@12345' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'ADMIN');
    ctx.admin = { token: res.body.data.token };
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await api('GET', '/users/me')).status, 401);
    assert.equal((await api('GET', '/users/me', { token: 'garbage' })).status, 401);
    const me = await api('GET', '/users/me', { token: ctx.alice.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, 'alice@test.local');
  });

  test('role checks: customers cannot use admin endpoints, admins cannot use customer ones', async () => {
    assert.equal((await api('GET', '/admin/dashboard', { token: ctx.alice.token })).status, 403);
    assert.equal((await api('GET', '/users', { token: ctx.alice.token })).status, 403);
    assert.equal((await api('POST', '/locations', { token: ctx.alice.token, body: {} })).status, 403);
    assert.equal((await api('GET', '/vehicles', { token: ctx.admin.token })).status, 403);
    assert.equal((await api('GET', '/reservations', { token: ctx.admin.token })).status, 403);
  });

  test('updates the profile and changes the password (current password required)', async () => {
    const noCurrent = await api('PUT', '/users/me', {
      token: ctx.bob.token,
      body: { fullName: 'Bob S', phone: '0770000000', newPassword: 'NewPassw0rd1' },
    });
    assert.equal(noCurrent.status, 422);

    const wrongCurrent = await api('PUT', '/users/me', {
      token: ctx.bob.token,
      body: { fullName: 'Bob S', currentPassword: 'Not-the-password1', newPassword: 'NewPassw0rd1' },
    });
    assert.equal(wrongCurrent.status, 422);
    assert.equal(wrongCurrent.body.errors[0].field, 'currentPassword');

    const ok = await api('PUT', '/users/me', {
      token: ctx.bob.token,
      body: { fullName: 'Bob S', phone: '0770000000', currentPassword: PASSWORD, newPassword: 'NewPassw0rd1' },
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.data.fullName, 'Bob S');

    const login = await api('POST', '/auth/login', { body: { email: 'bob@test.local', password: 'NewPassw0rd1' } });
    assert.equal(login.status, 200);
    ctx.bob.token = login.body.data.token;
  });
});

test.describe('parking administration', () => {
  test('admin creates a location', async () => {
    const res = await api('POST', '/locations', {
      token: ctx.admin.token,
      body: { name: 'Test Garage', address: '1 Test Street', operatingHours: '24 hours', contactNumber: '0112345678' },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'ACTIVE');
    ctx.location = res.body.data;
  });

  test('validates location input', async () => {
    const res = await api('POST', '/locations', { token: ctx.admin.token, body: { name: '', address: '' } });
    assert.equal(res.status, 422);
  });

  test('bulk-creates slots with padded numbers and rejects duplicates', async () => {
    const car = await api('POST', `/locations/${ctx.location.locationId}/slots/bulk`, {
      token: ctx.admin.token,
      body: { prefix: 'a', count: 5, slotType: 'CAR' },
    });
    assert.equal(car.status, 201, JSON.stringify(car.body));
    assert.equal(car.body.data.firstSlot, 'A01');
    assert.equal(car.body.data.lastSlot, 'A05');

    const bikes = await api('POST', `/locations/${ctx.location.locationId}/slots/bulk`, {
      token: ctx.admin.token,
      body: { prefix: 'M', count: 2, slotType: 'MOTORCYCLE' },
    });
    assert.equal(bikes.status, 201);

    const dup = await api('POST', `/locations/${ctx.location.locationId}/slots/bulk`, {
      token: ctx.admin.token,
      body: { prefix: 'A', count: 2, slotType: 'CAR' },
    });
    assert.equal(dup.status, 409);

    const badPrefix = await api('POST', `/locations/${ctx.location.locationId}/slots/bulk`, {
      token: ctx.admin.token,
      body: { prefix: "A'; DROP TABLE users;--", count: 1, slotType: 'CAR' },
    });
    assert.equal(badPrefix.status, 422);
  });

  test('admin lists slots and can add a single slot', async () => {
    const list = await api('GET', `/locations/${ctx.location.locationId}/slots`, { token: ctx.admin.token });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 7);
    ctx.slots = Object.fromEntries(list.body.data.map((slot) => [slot.slotNumber, slot]));

    const single = await api('POST', `/locations/${ctx.location.locationId}/slots`, {
      token: ctx.admin.token,
      body: { slotNumber: 'X99', slotType: 'CAR' },
    });
    assert.equal(single.status, 201);
    ctx.slots.X99 = single.body.data;

    const dup = await api('POST', `/locations/${ctx.location.locationId}/slots`, {
      token: ctx.admin.token,
      body: { slotNumber: 'X99', slotType: 'CAR' },
    });
    assert.equal(dup.status, 409);
  });

  test('admin creates fees; invalid periods are rejected', async () => {
    const car = await api('POST', '/fees', {
      token: ctx.admin.token,
      body: { locationId: ctx.location.locationId, vehicleType: 'CAR', hourlyRate: 3, dailyRate: 20, effectiveFrom: inHours(-48) },
    });
    assert.equal(car.status, 201, JSON.stringify(car.body));
    assert.equal(car.body.data.hourlyRate, 3);
    ctx.carFee = car.body.data;

    const bike = await api('POST', '/fees', {
      token: ctx.admin.token,
      body: { locationId: ctx.location.locationId, vehicleType: 'MOTORCYCLE', hourlyRate: 1, effectiveFrom: inHours(-48) },
    });
    assert.equal(bike.status, 201);

    const badPeriod = await api('POST', '/fees', {
      token: ctx.admin.token,
      body: { locationId: ctx.location.locationId, vehicleType: 'CAR', hourlyRate: 3, effectiveFrom: inHours(10), effectiveTo: inHours(5) },
    });
    assert.equal(badPeriod.status, 422);

    const negative = await api('POST', '/fees', {
      token: ctx.admin.token,
      body: { locationId: ctx.location.locationId, vehicleType: 'CAR', hourlyRate: -1, effectiveFrom: inHours(0) },
    });
    assert.equal(negative.status, 422);

    const list = await api('GET', '/fees', { token: ctx.admin.token });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 2);
  });

  test('public visitors see active locations with availability and the cheapest rate', async () => {
    const res = await api('GET', '/locations');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    const [loc] = res.body.data;
    assert.equal(loc.totalSlots, 8);
    assert.equal(loc.availableSlots, 8);
    assert.equal(loc.minHourlyRate, 1);

    const cars = await api('GET', '/locations?vehicleType=CAR');
    assert.equal(cars.body.data[0].availableSlots, 6);
    assert.equal(cars.body.data[0].minHourlyRate, 3);
  });

  test('location detail includes the current fees', async () => {
    const res = await api('GET', `/locations/${ctx.location.locationId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.fees.length, 2);
  });

  test('inactive locations are hidden from customers but visible to admins', async () => {
    const created = await api('POST', '/locations', {
      token: ctx.admin.token,
      body: { name: 'Closed Lot', address: '2 Test Street', status: 'INACTIVE' },
    });
    assert.equal(created.status, 201);
    const id = created.body.data.locationId;

    assert.equal((await api('GET', '/locations')).body.data.length, 1);
    assert.equal((await api('GET', `/locations/${id}`)).status, 404);
    assert.equal((await api('GET', '/locations', { token: ctx.admin.token })).body.data.length, 2);
    assert.equal((await api('GET', `/locations/${id}`, { token: ctx.admin.token })).status, 200);

    assert.equal((await api('DELETE', `/locations/${id}`, { token: ctx.admin.token })).status, 200);
  });

  test('search input is treated as data, not SQL', async () => {
    const res = await api('GET', `/locations?search=${encodeURIComponent("' OR 1=1 --")}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0);
    const all = await api('GET', `/locations?search=${encodeURIComponent('%')}`);
    assert.equal(all.body.data.length, 0, 'a literal % must not act as a wildcard');
  });
});

test.describe('vehicles', () => {
  test('customer registers vehicles', async () => {
    const car = await api('POST', '/vehicles', {
      token: ctx.alice.token,
      body: { registrationNumber: 'CAB-1234', vehicleType: 'CAR', makeModel: 'Toyota Aqua', color: 'White' },
    });
    assert.equal(car.status, 201, JSON.stringify(car.body));
    ctx.aliceCar = car.body.data;

    const bike = await api('POST', '/vehicles', {
      token: ctx.alice.token,
      body: { registrationNumber: 'BIKE-77', vehicleType: 'MOTORCYCLE' },
    });
    assert.equal(bike.status, 201);
    ctx.aliceBike = bike.body.data;

    const bobCar = await api('POST', '/vehicles', {
      token: ctx.bob.token,
      body: { registrationNumber: 'BOB-0001', vehicleType: 'CAR' },
    });
    assert.equal(bobCar.status, 201);
    ctx.bobCar = bobCar.body.data;
  });

  test('registration numbers are unique across all users', async () => {
    const res = await api('POST', '/vehicles', {
      token: ctx.bob.token,
      body: { registrationNumber: 'cab-1234', vehicleType: 'CAR' },
    });
    assert.equal(res.status, 409);
  });

  test('validates vehicle input', async () => {
    const res = await api('POST', '/vehicles', { token: ctx.alice.token, body: { registrationNumber: '', vehicleType: 'SPACESHIP' } });
    assert.equal(res.status, 422);
  });

  test('customers only see and change their own vehicles', async () => {
    const list = await api('GET', '/vehicles', { token: ctx.alice.token });
    assert.equal(list.body.data.length, 2);
    assert.equal((await api('GET', `/vehicles/${ctx.bobCar.vehicleId}`, { token: ctx.alice.token })).status, 404);
    assert.equal(
      (await api('PUT', `/vehicles/${ctx.bobCar.vehicleId}`, {
        token: ctx.alice.token,
        body: { registrationNumber: 'HACKED-1', vehicleType: 'CAR' },
      })).status,
      404,
    );
    assert.equal((await api('DELETE', `/vehicles/${ctx.bobCar.vehicleId}`, { token: ctx.alice.token })).status, 404);
  });

  test('a customer can edit and delete a vehicle without reservations', async () => {
    const created = await api('POST', '/vehicles', {
      token: ctx.alice.token,
      body: { registrationNumber: 'TEMP-1', vehicleType: 'VAN' },
    });
    const id = created.body.data.vehicleId;
    const updated = await api('PUT', `/vehicles/${id}`, {
      token: ctx.alice.token,
      body: { registrationNumber: 'TEMP-2', vehicleType: 'VAN', color: 'Blue' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.registrationNumber, 'TEMP-2');
    assert.equal((await api('DELETE', `/vehicles/${id}`, { token: ctx.alice.token })).status, 200);
    assert.equal((await api('GET', `/vehicles/${id}`, { token: ctx.alice.token })).status, 404);
  });
});

test.describe('reservations', () => {
  test('quote uses the applicable fee', async () => {
    const start = inHours(48);
    const end = inHours(50);
    const res = await api(
      'GET',
      `/locations/${ctx.location.locationId}/quote?vehicleType=CAR&startTime=${start}&endTime=${end}`,
      { token: ctx.alice.token },
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.estimatedFee, 6);
    assert.equal(res.body.data.billableHours, 2);
    assert.equal(res.body.data.startTime, start);
  });

  test('quote fails clearly when no fee is configured for that vehicle type', async () => {
    const res = await api(
      'GET',
      `/locations/${ctx.location.locationId}/quote?vehicleType=TRUCK&startTime=${inHours(48)}&endTime=${inHours(50)}`,
      { token: ctx.alice.token },
    );
    assert.equal(res.status, 422);
  });

  test('creates a reservation and prices it', async () => {
    const res = await api('POST', '/reservations', {
      token: ctx.alice.token,
      body: { vehicleId: ctx.aliceCar.vehicleId, slotId: ctx.slots.A01.slotId, startTime: inHours(48), endTime: inHours(51) },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'RESERVED');
    assert.equal(res.body.data.feeAmount, 9);
    assert.equal(res.body.data.slot.slotNumber, 'A01');
    assert.equal(res.body.data.location.name, 'Test Garage');
    assert.equal(res.body.data.vehicle.registrationNumber, 'CAB-1234');
    ctx.reservation = res.body.data;
  });

  test('rejects an overlapping booking of the same slot by another customer', async () => {
    const res = await api('POST', '/reservations', {
      token: ctx.bob.token,
      body: { vehicleId: ctx.bobCar.vehicleId, slotId: ctx.slots.A01.slotId, startTime: inHours(50), endTime: inHours(53) },
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
  });

  test('allows back-to-back bookings (end time equals the next start time)', async () => {
    const res = await api('POST', '/reservations', {
      token: ctx.bob.token,
      body: { vehicleId: ctx.bobCar.vehicleId, slotId: ctx.slots.A01.slotId, startTime: inHours(51), endTime: inHours(52) },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ctx.backToBack = res.body.data;
  });

  test('rejects the same vehicle booked twice for overlapping times in different slots', async () => {
    const res = await api('POST', '/reservations', {
      token: ctx.alice.token,
      body: { vehicleId: ctx.aliceCar.vehicleId, slotId: ctx.slots.A02.slotId, startTime: inHours(49), endTime: inHours(50) },
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
  });

  test('rejects a slot type that does not match the vehicle type', async () => {
    const res = await api('POST', '/reservations', {
      token: ctx.alice.token,
      body: { vehicleId: ctx.aliceCar.vehicleId, slotId: ctx.slots.M01.slotId, startTime: inHours(70), endTime: inHours(72) },
    });
    assert.equal(res.status, 422, JSON.stringify(res.body));
  });

  test('rejects bookings in the past, inverted windows, and over-long or far-future windows', async () => {
    const base = { vehicleId: ctx.aliceCar.vehicleId, slotId: ctx.slots.A03.slotId };
    assert.equal((await api('POST', '/reservations', { token: ctx.alice.token, body: { ...base, startTime: inHours(-5), endTime: inHours(-3) } })).status, 422);
    assert.equal((await api('POST', '/reservations', { token: ctx.alice.token, body: { ...base, startTime: inHours(10), endTime: inHours(8) } })).status, 422);
    assert.equal((await api('POST', '/reservations', { token: ctx.alice.token, body: { ...base, startTime: inHours(10), endTime: inHours(10 + 24 * 31) } })).status, 422);
    assert.equal((await api('POST', '/reservations', { token: ctx.alice.token, body: { ...base, startTime: inHours(24 * 100), endTime: inHours(24 * 100 + 2) } })).status, 422);
    assert.equal((await api('POST', '/reservations', { token: ctx.alice.token, body: { ...base, startTime: 'soon', endTime: 'later' } })).status, 422);
  });

  test("a customer cannot book with someone else's vehicle", async () => {
    const res = await api('POST', '/reservations', {
      token: ctx.alice.token,
      body: { vehicleId: ctx.bobCar.vehicleId, slotId: ctx.slots.A03.slotId, startTime: inHours(60), endTime: inHours(62) },
    });
    assert.equal(res.status, 404);
  });

  test('slots under maintenance cannot be booked', async () => {
    assert.equal((await api('PATCH', `/slots/${ctx.slots.A04.slotId}/status`, { token: ctx.admin.token, body: { status: 'MAINTENANCE' } })).status, 200);
    const res = await api('POST', '/reservations', {
      token: ctx.alice.token,
      body: { vehicleId: ctx.aliceCar.vehicleId, slotId: ctx.slots.A04.slotId, startTime: inHours(60), endTime: inHours(62) },
    });
    assert.equal(res.status, 409);
    await api('PATCH', `/slots/${ctx.slots.A04.slotId}/status`, { token: ctx.admin.token, body: { status: 'AVAILABLE' } });
  });

  test('availability excludes booked slots for the requested window only', async () => {
    const busy = await api(
      'GET',
      `/availability?locationId=${ctx.location.locationId}&startTime=${inHours(48)}&endTime=${inHours(50)}&vehicleType=CAR`,
      { token: ctx.alice.token },
    );
    assert.equal(busy.status, 200, JSON.stringify(busy.body));
    const busyNumbers = busy.body.data.availableSlots.map((slot) => slot.slotNumber);
    assert.ok(!busyNumbers.includes('A01'));
    assert.ok(busyNumbers.includes('A02'));

    const free = await api(
      'GET',
      `/availability?locationId=${ctx.location.locationId}&startTime=${inHours(80)}&endTime=${inHours(82)}&vehicleType=CAR`,
      { token: ctx.alice.token },
    );
    assert.ok(free.body.data.availableSlots.map((slot) => slot.slotNumber).includes('A01'));

    const list = await api(
      'GET',
      `/locations/${ctx.location.locationId}/slots?startTime=${inHours(48)}&endTime=${inHours(50)}`,
      { token: ctx.alice.token },
    );
    assert.equal(list.body.data.find((slot) => slot.slotNumber === 'A01').displayStatus, 'RESERVED');
    assert.equal(list.body.data.find((slot) => slot.slotNumber === 'A02').displayStatus, 'AVAILABLE');
  });

  test('two simultaneous requests for the same slot: exactly one wins', async () => {
    const attempt = (customer, vehicle) =>
      api('POST', '/reservations', {
        token: customer.token,
        body: { vehicleId: vehicle.vehicleId, slotId: ctx.slots.A05.slotId, startTime: inHours(100), endTime: inHours(103) },
      });
    const results = await Promise.all([attempt(ctx.alice, ctx.aliceCar), attempt(ctx.bob, ctx.bobCar)]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409], JSON.stringify(results.map((r) => r.body)));
  });

  test('two simultaneous requests for the same vehicle in different slots: exactly one wins', async () => {
    const attempt = (slot) =>
      api('POST', '/reservations', {
        token: ctx.alice.token,
        body: { vehicleId: ctx.aliceCar.vehicleId, slotId: slot.slotId, startTime: inHours(120), endTime: inHours(123) },
      });
    const results = await Promise.all([attempt(ctx.slots.A02), attempt(ctx.slots.A03)]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409], JSON.stringify(results.map((r) => r.body)));
  });

  test('many simultaneous requests for one slot never double-book it', async () => {
    const customers = [ctx.alice, ctx.bob];
    const attempts = Array.from({ length: 12 }, (_, i) => {
      const who = customers[i % 2];
      const vehicle = i % 2 === 0 ? ctx.aliceBike : ctx.bobCar;
      const slot = i % 2 === 0 ? ctx.slots.M01 : ctx.slots.X99;
      return api('POST', '/reservations', {
        token: who.token,
        body: { vehicleId: vehicle.vehicleId, slotId: slot.slotId, startTime: inHours(200), endTime: inHours(202) },
      });
    });
    const results = await Promise.all(attempts);
    const created = results.filter((r) => r.status === 201);
    // one winner per slot (M01 by Alice's bike, X99 by Bob's car); everything else is a conflict
    assert.equal(created.length, 2, JSON.stringify(results.map((r) => r.status)));
    assert.ok(results.every((r) => [201, 409].includes(r.status)), JSON.stringify(results.map((r) => r.status)));
  });

  test('lists own reservations with pagination, filtering and a summary', async () => {
    const mine = await api('GET', '/reservations', { token: ctx.alice.token });
    assert.equal(mine.status, 200);
    assert.ok(mine.body.data.items.length >= 1);
    assert.ok(mine.body.data.items.every((r) => r.userId === ctx.alice.user.userId));
    assert.equal(mine.body.data.pagination.page, 1);

    const filtered = await api('GET', '/reservations?status=CANCELLED', { token: ctx.alice.token });
    assert.equal(filtered.body.data.items.length, 0);
    assert.equal((await api('GET', '/reservations?status=BOGUS', { token: ctx.alice.token })).status, 422);

    const summary = await api('GET', '/reservations/summary', { token: ctx.alice.token });
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    for (const key of ['total', 'upcoming', 'active', 'completed', 'cancelled', 'totalSpent']) {
      assert.equal(typeof summary.body.data[key], 'number', `summary.${key}`);
    }
  });

  test("customers cannot view or cancel another customer's reservation", async () => {
    assert.equal((await api('GET', `/reservations/${ctx.reservation.reservationId}`, { token: ctx.bob.token })).status, 404);
    assert.equal((await api('PATCH', `/reservations/${ctx.reservation.reservationId}/cancel`, { token: ctx.bob.token })).status, 404);
    assert.equal((await api('GET', `/reservations/${ctx.reservation.reservationId}`, { token: ctx.alice.token })).status, 200);
  });

  test('a vehicle with reservations cannot be deleted', async () => {
    const res = await api('DELETE', `/vehicles/${ctx.aliceCar.vehicleId}`, { token: ctx.alice.token });
    assert.equal(res.status, 409);
  });

  test('cancelling frees the slot and cannot be repeated', async () => {
    const res = await api('PATCH', `/reservations/${ctx.reservation.reservationId}/cancel`, { token: ctx.alice.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'CANCELLED');

    const again = await api('PATCH', `/reservations/${ctx.reservation.reservationId}/cancel`, { token: ctx.alice.token });
    assert.equal(again.status, 409);

    const rebook = await api('POST', '/reservations', {
      token: ctx.bob.token,
      body: { vehicleId: ctx.bobCar.vehicleId, slotId: ctx.slots.A01.slotId, startTime: inHours(48), endTime: inHours(50) },
    });
    assert.equal(rebook.status, 201, JSON.stringify(rebook.body));
    ctx.rebook = rebook.body.data;
  });
});

test.describe('administrator features', () => {
  test('lists and filters reservations across customers', async () => {
    const all = await api('GET', '/admin/reservations', { token: ctx.admin.token });
    assert.equal(all.status, 200);
    assert.ok(all.body.data.items.length >= 3);

    const byUser = await api('GET', '/admin/reservations?search=alice', { token: ctx.admin.token });
    assert.ok(byUser.body.data.items.length >= 1);
    assert.ok(byUser.body.data.items.every((r) => r.customer.email === 'alice@test.local'));

    const cancelled = await api('GET', '/admin/reservations?status=CANCELLED', { token: ctx.admin.token });
    assert.ok(cancelled.body.data.items.every((r) => r.status === 'CANCELLED'));
  });

  test('enforces the reservation status state machine', async () => {
    const id = ctx.rebook.reservationId;
    assert.equal((await api('PATCH', `/admin/reservations/${id}/status`, { token: ctx.admin.token, body: { status: 'BOGUS' } })).status, 422);
    const active = await api('PATCH', `/admin/reservations/${id}/status`, { token: ctx.admin.token, body: { status: 'ACTIVE' } });
    assert.equal(active.status, 200, JSON.stringify(active.body));
    const done = await api('PATCH', `/admin/reservations/${id}/status`, { token: ctx.admin.token, body: { status: 'COMPLETED' } });
    assert.equal(done.status, 200);
    const back = await api('PATCH', `/admin/reservations/${id}/status`, { token: ctx.admin.token, body: { status: 'ACTIVE' } });
    assert.equal(back.status, 409);
    const cancelledOne = await api('PATCH', `/admin/reservations/${ctx.reservation.reservationId}/status`, { token: ctx.admin.token, body: { status: 'RESERVED' } });
    assert.equal(cancelledOne.status, 409);
  });

  test('dashboard reports totals', async () => {
    const res = await api('GET', '/admin/dashboard', { token: ctx.admin.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const d = res.body.data;
    assert.equal(d.users, 3, 'customer accounts only');
    assert.equal(d.vehicles, 3);
    assert.equal(d.locations, 1);
    assert.equal(d.slots, 8);
    assert.equal(d.cancelledReservations, 1);
    assert.equal(d.completedReservations, 1);
    assert.equal(d.totalFees, 6, 'fees of completed reservations only');
    assert.equal(d.locationSummary.length, 1);
    assert.equal(d.locationSummary[0].totalSlots, 8);
    assert.ok(Array.isArray(d.recentReservations) && d.recentReservations.length <= 5);
  });

  test('time-based lifecycle moves reservations to ACTIVE and COMPLETED', async () => {
    const { pool } = require('../src/config/database');
    const reservationService = require('../src/services/reservationService');
    const { toSqlDateTime } = require('../src/utils/dateTime');
    const at = (hours) => toSqlDateTime(new Date(Date.now() + hours * 3_600_000));

    const insert = async (slot, start, end) => {
      const [result] = await pool.query(
        'INSERT INTO reservations (user_id, vehicle_id, slot_id, start_time, end_time, fee_amount, status) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [ctx.alice.user.userId, ctx.aliceCar.vehicleId, slot.slotId, start, end, 'RESERVED'],
      );
      return result.insertId;
    };
    const inProgress = await insert(ctx.slots.A02, at(-1), at(1));
    const finished = await insert(ctx.slots.A03, at(-5), at(-2));
    const upcoming = await insert(ctx.slots.A04, at(5), at(6));

    await reservationService.refreshStatuses();

    const statusOf = async (id) => (await pool.query('SELECT status FROM reservations WHERE reservation_id = ?', [id]))[0][0].status;
    assert.equal(await statusOf(inProgress), 'ACTIVE');
    assert.equal(await statusOf(finished), 'COMPLETED');
    assert.equal(await statusOf(upcoming), 'RESERVED');

    // A started reservation can no longer be cancelled by the customer.
    const cancel = await api('PATCH', `/reservations/${inProgress}/cancel`, { token: ctx.alice.token });
    assert.equal(cancel.status, 409);
  });

  test('lists users with search and pagination', async () => {
    const res = await api('GET', '/users?search=alice&limit=5', { token: ctx.admin.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.pagination.total, 1);
    assert.equal(JSON.stringify(res.body).includes('password'), false);
  });

  test('deactivating a user locks them out immediately; admins cannot deactivate themselves', async () => {
    const off = await api('PATCH', `/users/${ctx.bob.user.userId}/status`, { token: ctx.admin.token, body: { status: 'INACTIVE' } });
    assert.equal(off.status, 200, JSON.stringify(off.body));

    assert.equal((await api('GET', '/users/me', { token: ctx.bob.token })).status, 403);
    assert.equal((await api('POST', '/auth/login', { body: { email: 'bob@test.local', password: 'NewPassw0rd1' } })).status, 403);

    const me = await api('GET', '/users/me', { token: ctx.admin.token });
    const self = await api('PATCH', `/users/${me.body.data.userId}/status`, { token: ctx.admin.token, body: { status: 'INACTIVE' } });
    assert.ok([400, 403, 409, 422].includes(self.status), `unexpected ${self.status}`);

    await api('PATCH', `/users/${ctx.bob.user.userId}/status`, { token: ctx.admin.token, body: { status: 'ACTIVE' } });
  });

  test('a slot or location with reservations cannot be deleted', async () => {
    const slot = await api('DELETE', `/slots/${ctx.slots.A01.slotId}`, { token: ctx.admin.token });
    assert.equal(slot.status, 409);
    const location = await api('DELETE', `/locations/${ctx.location.locationId}`, { token: ctx.admin.token });
    assert.ok([409, 422].includes(location.status), `unexpected ${location.status}`);
  });

  test('fees can be updated and deleted', async () => {
    const updated = await api('PUT', `/fees/${ctx.carFee.feeId}`, {
      token: ctx.admin.token,
      body: { locationId: ctx.location.locationId, vehicleType: 'CAR', hourlyRate: 4, dailyRate: 25, effectiveFrom: inHours(-48) },
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.hourlyRate, 4);

    const extra = await api('POST', '/fees', {
      token: ctx.admin.token,
      body: { locationId: ctx.location.locationId, vehicleType: 'VAN', hourlyRate: 6, effectiveFrom: inHours(-1) },
    });
    assert.equal((await api('DELETE', `/fees/${extra.body.data.feeId}`, { token: ctx.admin.token })).status, 200);
  });
});
