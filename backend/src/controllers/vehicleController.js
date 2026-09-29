const vehicleModel = require('../models/vehicleModel');
const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const { toId } = require('../utils/ids');
const { notFound, conflict } = require('../utils/errors');

const fields = (body) => ({
  registrationNumber: body.registrationNumber,
  vehicleType: body.vehicleType,
  makeModel: body.makeModel || null,
  color: body.color || null,
});

const duplicateRegistration = () => conflict('A vehicle with this registration number is already registered.');

const listVehicles = asyncHandler(async (req, res) => {
  success(res, await vehicleModel.listByUser(req.user.userId));
});

const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleModel.findOwned(toId(req.params.id, 'Vehicle ID'), req.user.userId);
  if (!vehicle) throw notFound('Vehicle not found.');
  success(res, vehicle);
});

const createVehicle = asyncHandler(async (req, res) => {
  if (await vehicleModel.findByRegistration(req.body.registrationNumber)) throw duplicateRegistration();
  try {
    const vehicle = await vehicleModel.create({ userId: req.user.userId, ...fields(req.body) });
    created(res, vehicle, 'Vehicle added.');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateRegistration();
    throw error;
  }
});

const updateVehicle = asyncHandler(async (req, res) => {
  const vehicleId = toId(req.params.id, 'Vehicle ID');
  const existing = await vehicleModel.findOwned(vehicleId, req.user.userId);
  if (!existing) throw notFound('Vehicle not found.');

  const sameRegistration = await vehicleModel.findByRegistration(req.body.registrationNumber);
  if (sameRegistration && sameRegistration.vehicleId !== vehicleId) throw duplicateRegistration();

  try {
    const vehicle = await vehicleModel.update(vehicleId, req.user.userId, fields(req.body));
    success(res, vehicle, 200, 'Vehicle updated.');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateRegistration();
    throw error;
  }
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicleId = toId(req.params.id, 'Vehicle ID');
  try {
    const removed = await vehicleModel.remove(vehicleId, req.user.userId);
    if (!removed) throw notFound('Vehicle not found.');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw conflict('This vehicle has reservations, so it cannot be deleted. Your booking history is kept.');
    }
    throw error;
  }
  success(res, null, 200, 'Vehicle deleted.');
});

module.exports = { listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle };
