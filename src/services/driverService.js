import { api } from './api/client.js';
import { ROLES } from '../constants/roles.js';

/**
 * Transport drivers — tenant users with role `driver`.
 * Preferred endpoints: /admin/transport/drivers*
 * Fallback: /admin/users?role=driver (+ create with role=driver)
 */

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function pickString(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    return String(value);
  }
  return '';
}

function isFalsyFlag(value) {
  if (value === false || value === 0) return true;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'false' || text === '0' || text === 'no' || text === 'inactive' || text === 'disabled';
}

function resolveDriverActive(item, user = {}) {
  const statusText = String(
    item.status
    || item.accountStatus
    || item.account_status
    || user.status
    || user.accountStatus
    || '',
  ).trim().toLowerCase();
  if (['inactive', 'disabled', 'deactivated', 'suspended', 'deleted'].includes(statusText)) {
    return false;
  }
  if (
    isFalsyFlag(item.active)
    || isFalsyFlag(item.isActive)
    || isFalsyFlag(item.enabled)
    || isFalsyFlag(user.active)
    || isFalsyFlag(user.isActive)
    || isFalsyFlag(user.enabled)
  ) {
    return false;
  }
  return true;
}

export function normalizeDriver(item) {
  if (!item) return null;
  const user = item.user && typeof item.user === 'object' ? item.user : {};
  const vehicle = item.vehicle && typeof item.vehicle === 'object' ? item.vehicle : {};
  const id = pickString(item.id, item.driverId, item.driver_id, item.userId, item.user_id, user.id);
  if (!id) return null;
  const active = resolveDriverActive(item, user);
  return {
    id,
    userId: pickString(item.userId, item.user_id, user.id, id),
    name: pickString(item.name, item.fullName, item.full_name, user.name, user.fullName),
    email: pickString(item.email, user.email),
    mobile: pickString(item.mobile, item.phone, item.driverPhone, user.mobile, user.phone),
    licenseNumber: pickString(item.licenseNumber, item.license_number, item.licenceNumber),
    status: active ? 'active' : 'inactive',
    active,
    vehicleId: pickString(item.vehicleId, item.vehicle_id, vehicle.id) || null,
    vehicleNumber: pickString(item.vehicleNumber, item.vehicle_number, vehicle.vehicleNumber, vehicle.number) || null,
    role: ROLES.DRIVER,
  };
}

function isNotFound(err) {
  return err?.status === 404 || err?.code === 'NOT_FOUND';
}

export async function listDrivers(filters = {}) {
  try {
    const data = await api.get('/admin/transport/drivers', filters);
    return asList(data).map(normalizeDriver).filter(Boolean);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    const data = await api.get('/admin/users', { ...filters, role: ROLES.DRIVER });
    return asList(data).map(normalizeDriver).filter(Boolean);
  }
}

export async function createDriver(payload) {
  const body = {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    mobile: String(payload.mobile || '').trim() || undefined,
    licenseNumber: String(payload.licenseNumber || '').trim() || undefined,
    role: ROLES.DRIVER,
    status: payload.status || 'active',
  };
  try {
    const data = await api.post('/admin/transport/drivers', body);
    return {
      driver: normalizeDriver(data?.driver || data?.user || data),
      tempPassword: data?.tempPassword || data?.temporaryPassword || null,
    };
  } catch (err) {
    if (!isNotFound(err)) throw err;
    const data = await api.post('/admin/users', body);
    return {
      driver: normalizeDriver(data?.user || data),
      tempPassword: data?.tempPassword || data?.temporaryPassword || null,
    };
  }
}

export async function updateDriver(driverId, updates) {
  const body = {
    name: updates.name != null ? String(updates.name).trim() : undefined,
    email: updates.email != null ? String(updates.email).trim().toLowerCase() : undefined,
    mobile: updates.mobile != null ? String(updates.mobile).trim() : undefined,
    licenseNumber: updates.licenseNumber != null ? String(updates.licenseNumber).trim() : undefined,
    status: updates.status,
    active: updates.active,
  };
  Object.keys(body).forEach((key) => {
    if (body[key] === undefined) delete body[key];
  });
  try {
    const data = await api.patch(`/admin/transport/drivers/${driverId}`, body);
    return normalizeDriver(data);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    const data = await api.patch(`/admin/users/${driverId}`, body);
    return normalizeDriver(data);
  }
}

export async function deactivateDriver(driverId) {
  try {
    const data = await api.patch(`/admin/transport/drivers/${driverId}/deactivate`, {});
    return normalizeDriver(data) || { id: driverId, active: false, status: 'inactive' };
  } catch (err) {
    if (!isNotFound(err)) throw err;
    try {
      const data = await api.patch(`/admin/users/${driverId}/deactivate`);
      return normalizeDriver(data) || { id: driverId, active: false, status: 'inactive' };
    } catch (inner) {
      if (!isNotFound(inner)) throw inner;
      return updateDriver(driverId, { status: 'inactive', active: false });
    }
  }
}

export async function activateDriver(driverId) {
  try {
    const data = await api.patch(`/admin/transport/drivers/${driverId}/activate`, {});
    return normalizeDriver(data) || { id: driverId, active: true, status: 'active' };
  } catch (err) {
    if (!isNotFound(err)) throw err;
    try {
      const data = await api.patch(`/admin/users/${driverId}/activate`);
      return normalizeDriver(data) || { id: driverId, active: true, status: 'active' };
    } catch (inner) {
      if (!isNotFound(inner)) throw inner;
      return updateDriver(driverId, { status: 'active', active: true });
    }
  }
}

/**
 * Assign driver ↔ vehicle. Authoritative field is vehicle.driverUserId.
 */
export async function assignDriverToVehicle({ driverUserId, vehicleId }) {
  if (!driverUserId || !vehicleId) {
    throw new Error('driverUserId and vehicleId are required.');
  }
  try {
    const data = await api.patch(`/admin/transport/vehicles/${vehicleId}`, {
      driverUserId,
    });
    return data;
  } catch (err) {
    if (!isNotFound(err)) throw err;
    const data = await api.put(`/admin/transport/vehicles/${vehicleId}/driver`, {
      driverUserId,
    });
    return data;
  }
}

export async function clearVehicleDriver(vehicleId) {
  if (!vehicleId) throw new Error('vehicleId is required.');
  return api.patch(`/admin/transport/vehicles/${vehicleId}`, { driverUserId: null });
}
