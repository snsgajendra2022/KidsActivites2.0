import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getApplication, getStudentProfile } from './enrollmentService.js';
import { getParentChildren } from './parentService.js';
import { geocodeAddress } from './geocoding/placeSearch.js';
import {
  extractAddressFromApplication,
  formatTransportAddress,
  isTransportAddressComplete,
  normalizeTransportAddress,
  toApiAddressPayload,
} from '../utils/transportAddress.js';

const ADDRESS_OVERRIDE_KEY = 'sb_student_transport_address';

function readOverrides() {
  return getStore(ADDRESS_OVERRIDE_KEY, {});
}

function writeOverrides(next) {
  setStore(ADDRESS_OVERRIDE_KEY, next);
}

async function resolveApplicationAddress(studentId) {
  const override = readOverrides()[studentId];
  if (override && isTransportAddressComplete(override)) {
    return {
      address: normalizeTransportAddress(override),
      source: 'override',
      applicationId: studentId,
    };
  }

  // 1) Enrollment application (primary source for address forms)
  try {
    const app = await getApplication(studentId);
    if (app) {
      const address = extractAddressFromApplication(app);
      if (isTransportAddressComplete(address)) {
        return {
          address,
          source: 'application',
          applicationId: app.id || studentId,
          fullName: app.student?.fullName || app.fullName || '',
          classId: app.student?.classId || '',
          className: app.student?.classApplying || '',
        };
      }
      return {
        address,
        source: 'application-incomplete',
        applicationId: app.id || studentId,
        fullName: app.student?.fullName || app.fullName || '',
        classId: app.student?.classId || '',
        className: app.student?.classApplying || '',
      };
    }
  } catch {
    /* fall through */
  }

  // 2) Student profile may embed address / applicationId
  try {
    const profile = await getStudentProfile(studentId);
    const applicationId = profile.applicationId || profile.id || studentId;
    if (profile.address || profile.enrollmentAddress) {
      const address = normalizeTransportAddress(profile.address || profile.enrollmentAddress);
      if (isTransportAddressComplete(address)) {
        return {
          address,
          source: 'profile',
          applicationId,
          fullName: profile.fullName || '',
          classId: profile.classId || '',
          className: profile.classApplying || profile.className || '',
        };
      }
    }
    if (applicationId && String(applicationId) !== String(studentId)) {
      try {
        const app = await getApplication(applicationId);
        const address = extractAddressFromApplication(app);
        return {
          address,
          source: 'application-linked',
          applicationId,
          fullName: profile.fullName || app?.student?.fullName || '',
          classId: profile.classId || '',
          className: profile.classApplying || '',
        };
      } catch {
        /* ignore */
      }
    }
    return {
      address: normalizeTransportAddress(override || {}),
      source: 'empty',
      applicationId,
      fullName: profile.fullName || '',
      classId: profile.classId || '',
      className: profile.classApplying || profile.className || '',
    };
  } catch {
    return {
      address: normalizeTransportAddress(override || {}),
      source: 'empty',
      applicationId: studentId,
      fullName: '',
      classId: '',
      className: '',
    };
  }
}

/**
 * Load enrolled student context for transport (IDs + application address).
 */
export async function fetchStudentTransportContext(studentId) {
  if (!studentId) throw new Error('Student is required.');

  const resolved = await resolveApplicationAddress(studentId);
  const address = normalizeTransportAddress(resolved.address);
  return {
    studentId: String(studentId),
    applicationId: resolved.applicationId || studentId,
    fullName: resolved.fullName || '',
    classId: resolved.classId || '',
    className: resolved.className || '',
    address,
    addressComplete: isTransportAddressComplete(address),
    addressLabel: formatTransportAddress(address) || 'Address missing',
    addressSource: resolved.source,
  };
}

/**
 * Build a map stop from a student's enrollment application address.
 * Geocodes the address and returns lat/lng for the route editor.
 */
export async function buildMappedStopFromStudent(studentId, { latitude, longitude } = {}) {
  const ctx = await fetchStudentTransportContext(studentId);
  if (!ctx.addressComplete) {
    const err = new Error(
      `${ctx.fullName || 'This student'} has no complete address on the enrollment application. Update the application address first.`,
    );
    err.code = 'ADDRESS_MISSING';
    err.context = ctx;
    throw err;
  }

  const query = formatTransportAddress(ctx.address);
  // Pass structured address so geocoder can prefer PIN / locality over random POIs.
  const place = await geocodeAddress(ctx.address, { latitude, longitude });
  if (!place) {
    const err = new Error(`Could not locate "${query}" on the map. Check the application address / PIN.`);
    err.code = 'GEOCODE_FAILED';
    err.context = ctx;
    throw err;
  }

  const pin = String(ctx.address?.pinCode || '').trim();

  return {
    context: ctx,
    stop: {
      id: `stu-${ctx.studentId}`,
      name: ctx.fullName ? `${ctx.fullName} (home)` : 'Student home',
      lat: place.latitude,
      lng: place.longitude,
      radiusMeters: 80,
      stopType: 'pickup',
      studentId: ctx.studentId,
      applicationId: ctx.applicationId,
      addressLabel: ctx.addressLabel || place.label || place.name || query,
      pinCode: pin || undefined,
    },
    place,
  };
}

/** Admin updates student home address used for pickup matching. */
export async function updateStudentTransportAddress(studentId, address) {
  const payload = toApiAddressPayload(address);
  if (!isTransportAddressComplete(payload)) {
    throw new Error('Street address and city or PIN code are required.');
  }

  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const overrides = readOverrides();
      overrides[studentId] = normalizeTransportAddress(payload);
      writeOverrides(overrides);

      const apps = getStore('sb_applications', []);
      const index = (apps || []).findIndex((item) => String(item.id) === String(studentId));
      if (index >= 0) {
        apps[index] = {
          ...apps[index],
          address: {
            ...(apps[index].address || {}),
            currentAddress: payload.currentAddress,
            permanentAddress: payload.permanentAddress,
            city: payload.city,
            state: payload.state,
            pinCode: payload.pinCode,
            country: payload.country,
          },
        };
        setStore('sb_applications', apps);
      }

      return {
        studentId,
        address: overrides[studentId],
        addressComplete: true,
        addressLabel: formatTransportAddress(overrides[studentId]),
      };
    },
    apiFn: async () => {
      await api.patch(`/admin/students/${studentId}`, {
        address: {
          line1: payload.line1,
          line2: payload.line2,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          country: payload.country,
          currentAddress: payload.currentAddress,
          permanentAddress: payload.permanentAddress,
          pinCode: payload.pinCode,
        },
      });
      return fetchStudentTransportContext(studentId);
    },
  });
}

/** Parent updates child home address when enrollment address is incomplete. */
export async function updateParentChildTransportAddress(childId, address) {
  const payload = toApiAddressPayload(address);
  if (!isTransportAddressComplete(payload)) {
    throw new Error('Street address and city or PIN code are required.');
  }

  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const overrides = readOverrides();
      overrides[childId] = normalizeTransportAddress(payload);
      writeOverrides(overrides);
      return {
        studentId: childId,
        address: overrides[childId],
        addressComplete: true,
        addressLabel: formatTransportAddress(overrides[childId]),
      };
    },
    apiFn: async () => {
      await api.patch(`/parent/children/${childId}/address`, {
        address: {
          line1: payload.line1,
          line2: payload.line2,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          country: payload.country,
          currentAddress: payload.currentAddress,
          permanentAddress: payload.permanentAddress,
          pinCode: payload.pinCode,
        },
      });
      return {
        studentId: childId,
        address: normalizeTransportAddress(payload),
        addressComplete: true,
        addressLabel: formatTransportAddress(payload),
      };
    },
  });
}

/** Parent: resolve child address for transport panel (selected student when multi-child). */
export async function fetchParentTransportAddress(user, studentId = null) {
  const children = await getParentChildren(user);
  const list = Array.isArray(children) ? children : [];
  const wanted = studentId != null && studentId !== '' ? String(studentId) : '';
  const child = wanted
    ? list.find((item) => {
      const ids = [
        item?.studentId,
        item?.enrolledStudentId,
        item?.id,
        item?.applicationId,
      ].map((value) => (value != null ? String(value) : '')).filter(Boolean);
      return ids.includes(wanted);
    }) || list[0]
    : list[0];
  if (!child) return null;
  const id = child.studentId || child.applicationId || child.id;
  try {
    const ctx = await fetchStudentTransportContext(id);
    return {
      studentId: id,
      applicationId: ctx.applicationId || child.applicationId || id,
      studentName: ctx.fullName || child.studentName || child.fullName || child.name || 'Child',
      address: ctx.address,
      addressComplete: ctx.addressComplete,
      addressLabel: ctx.addressLabel,
    };
  } catch {
    const override = readOverrides()[id];
    const address = override
      ? normalizeTransportAddress(override)
      : normalizeTransportAddress(child.address || {});
    return {
      studentId: id,
      applicationId: child.applicationId || id,
      studentName: child.studentName || child.fullName || child.name || 'Child',
      address,
      addressComplete: isTransportAddressComplete(address),
      addressLabel: formatTransportAddress(address) || 'Address missing',
    };
  }
}
