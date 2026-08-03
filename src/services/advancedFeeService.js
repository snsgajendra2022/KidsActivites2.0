import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { createCrudService } from './schoolModules/createCrudService.js';
import { getFeeStructures as getSettingsFeeStructures } from './settingsService.js';

const HEAD_SEED = [
  { id: 'fh-tuition', key: 'tuition', name: 'Tuition Fee', amount: 12000, active: true },
  { id: 'fh-transport', key: 'transport', name: 'Transport Fee', amount: 3000, active: true },
  { id: 'fh-activity', key: 'activity', name: 'Activity Fee', amount: 1500, active: true },
  { id: 'fh-exam', key: 'exam', name: 'Exam Fee', amount: 800, active: true },
];

const STRUCTURE_SEED = [
  {
    id: 'fs-default',
    name: 'Default Annual Structure',
    classId: null,
    classIds: [],
    headIds: HEAD_SEED.map((h) => h.id),
    heads: HEAD_SEED.map(({ id, key, name, amount }) => ({ id, key, name, amount })),
    active: true,
  },
];

const INVOICE_KEY = 'sb_advanced_fee_invoices';

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function asList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items || data.content || data.heads || data.structures || data.invoices || [];
}

function sumHeads(heads = []) {
  return heads.reduce((sum, head) => sum + Number(head.amount || head.defaultAmount || 0), 0);
}

function isMissingRouteError(err) {
  const status = Number(err?.status || 0);
  return status === 404 || status === 405;
}

/** Normalize structure so the UI always has a heads[].amount list. */
export function normalizeFeeStructure(structure, headsCatalog = []) {
  if (!structure) return null;
  const catalogById = new Map(headsCatalog.map((h) => [String(h.id), h]));
  let heads = Array.isArray(structure.heads) ? structure.heads : [];

  if (!heads.length && Array.isArray(structure.headIds)) {
    heads = structure.headIds
      .map((id) => catalogById.get(String(id)))
      .filter(Boolean)
      .map((h) => ({
        id: h.id,
        key: h.key,
        name: h.name || h.label,
        amount: Number(h.amount ?? h.defaultAmount ?? 0),
      }));
  }

  heads = heads.map((h) => ({
    id: h.id || h.key,
    key: h.key || h.id,
    name: h.name || h.label || h.key || 'Fee head',
    amount: Number(h.amount ?? h.defaultAmount ?? 0),
  }));

  const gross = structure.gross != null ? Number(structure.gross) : sumHeads(heads);
  return {
    ...structure,
    id: structure.id,
    name: structure.name || structure.label || 'Fee structure',
    classId: structure.classId ?? null,
    heads,
    gross,
    active: structure.active !== false,
  };
}

function buildDefaultStructure(classId = null) {
  const heads = HEAD_SEED.map(({ id, key, name, amount }) => ({ id, key, name, amount }));
  return normalizeFeeStructure({
    id: classId ? `fs-default-${classId}` : 'fs-default',
    name: 'Default Annual Structure',
    classId: classId || null,
    classIds: classId ? [classId] : [],
    heads,
    gross: sumHeads(heads),
    active: true,
    isDefault: true,
  }, heads);
}

function mapSettingsStructure(item) {
  if (!item) return null;
  const breakdown = item.breakdown || {};
  const heads = [
    { key: 'admission', name: 'Admission Fee', amount: Number(breakdown.admissionFee || 0) },
    { key: 'registration', name: 'Registration Fee', amount: Number(breakdown.registrationFee || 0) },
    { key: 'tuition', name: 'Tuition Fee', amount: Number(breakdown.tuitionFee || 0) },
    { key: 'transport', name: 'Transport Fee', amount: Number(breakdown.transportFee || 0) },
    { key: 'activity', name: 'Activity Fee', amount: Number(breakdown.activityFee || 0) },
  ].filter((h) => h.amount > 0);

  return normalizeFeeStructure({
    id: item.id,
    name: item.label || item.classApplying || 'Fee structure',
    classId: item.classId || null,
    classApplying: item.classApplying || null,
    heads: heads.length
      ? heads
      : HEAD_SEED.map(({ id, key, name, amount }) => ({ id, key, name, amount })),
    gross: item.total != null ? Number(item.total) : undefined,
    active: item.active !== false,
  });
}

export const feeHeadService = createCrudService({
  key: 'fee_heads',
  resource: 'fees/heads',
  seed: HEAD_SEED,
  idPrefix: 'fh',
});

export const feeStructureService = createCrudService({
  key: 'fee_structures',
  resource: 'fees/structures',
  seed: STRUCTURE_SEED,
  idPrefix: 'fs',
});

export async function listFeeHeads(filters = {}) {
  try {
    const items = await feeHeadService.list(filters);
    const list = asList(items).map((h) => ({
      ...h,
      name: h.name || h.label,
      amount: Number(h.amount ?? h.defaultAmount ?? 0),
    }));
    return list.length ? list : HEAD_SEED.map((h) => ({ ...h }));
  } catch (err) {
    if (!isMissingRouteError(err)) throw err;
    return HEAD_SEED.map((h) => ({ ...h }));
  }
}

export async function listFeeStructures(filters = {}) {
  let structures = [];
  let heads = HEAD_SEED.map((h) => ({ ...h }));

  try {
    heads = await listFeeHeads();
  } catch {
    heads = HEAD_SEED.map((h) => ({ ...h }));
  }

  try {
    structures = asList(await feeStructureService.list(filters))
      .map((s) => normalizeFeeStructure(s, heads))
      .filter(Boolean);
  } catch (err) {
    if (!isMissingRouteError(err)) {
      console.warn('[AdvancedFees] structures list failed:', err?.message || err);
    }
  }

  if (!structures.length) {
    try {
      const settingsStructures = await getSettingsFeeStructures();
      structures = asList(settingsStructures)
        .map(mapSettingsStructure)
        .filter(Boolean);
    } catch {
      /* ignore */
    }
  }

  if (!structures.length) {
    structures = [buildDefaultStructure(filters.classId || null)];
  }

  return structures;
}

/**
 * Resolve the best fee structure for a class.
 * Always returns a usable structure (default heads if nothing is configured yet).
 */
export async function getFeeStructureForClass(classId) {
  const structures = await listFeeStructures(classId ? { classId } : {});
  if (!structures.length) {
    return buildDefaultStructure(classId || null);
  }

  const match = structures.find((s) => (
    (classId && String(s.classId) === String(classId))
    || (classId && Array.isArray(s.classIds) && s.classIds.map(String).includes(String(classId)))
  ));
  if (match) return match;

  const byCode = structures.find((s) => (
    classId && s.classApplying
    && String(s.classApplying).toLowerCase() === String(classId).toLowerCase()
  ));
  if (byCode) return byCode;

  return structures.find((s) => s.active) || structures[0] || buildDefaultStructure(classId || null);
}

function readInvoices() {
  return getStore(INVOICE_KEY, []);
}

function writeInvoices(items) {
  setStore(INVOICE_KEY, items);
}

function computeNet({ gross, discount = 0, scholarship = 0 }) {
  return Math.max(0, Number(gross || 0) - Number(discount || 0) - Number(scholarship || 0));
}

/**
 * POST /admin/fees/invoices/generate
 */
export async function generateFeeInvoice(payload) {
  return routeRequest({
    mockFn: async () => {
      await delay(180);
      const structure = payload.feeStructureId
        ? (await listFeeStructures()).find((s) => String(s.id) === String(payload.feeStructureId))
        : await getFeeStructureForClass(payload.classId);
      const resolved = structure || buildDefaultStructure(payload.classId);
      const heads = resolved.heads?.length ? resolved.heads : HEAD_SEED;
      const gross = sumHeads(heads);
      const net = computeNet({
        gross,
        discount: payload.discount,
        scholarship: payload.scholarship,
      });
      const invoice = {
        id: makeId('inv'),
        status: 'issued',
        classId: payload.classId,
        studentId: payload.studentId,
        feeStructureId: resolved?.isDefault ? null : (resolved?.id || payload.feeStructureId || null),
        discount: Number(payload.discount || 0),
        scholarship: Number(payload.scholarship || 0),
        dueDate: payload.dueDate || null,
        gateway: payload.gateway || 'manual',
        heads,
        gross,
        net,
        idempotencyKey: payload.idempotencyKey || null,
        createdAt: new Date().toISOString(),
        message: 'Invoice generated.',
      };
      const items = readInvoices();
      items.unshift(invoice);
      writeInvoices(items);
      return invoice;
    },
    apiFn: async () => {
      const body = { ...payload };
      // Don't send synthetic default ids to the backend
      if (body.feeStructureId && String(body.feeStructureId).startsWith('fs-default')) {
        delete body.feeStructureId;
      }
      try {
        return await api.post('/admin/fees/invoices/generate', body);
      } catch (err) {
        if (!isMissingRouteError(err)) throw err;
        // Soft fallback when invoice API is not deployed yet
        const structure = await getFeeStructureForClass(payload.classId);
        const heads = structure?.heads?.length ? structure.heads : HEAD_SEED;
        const gross = sumHeads(heads);
        const net = computeNet({
          gross,
          discount: payload.discount,
          scholarship: payload.scholarship,
        });
        return {
          id: makeId('inv'),
          status: 'issued',
          classId: payload.classId,
          studentId: payload.studentId,
          feeStructureId: structure?.isDefault ? null : structure?.id || null,
          discount: Number(payload.discount || 0),
          scholarship: Number(payload.scholarship || 0),
          dueDate: payload.dueDate || null,
          gateway: payload.gateway || 'manual',
          heads,
          gross,
          net,
          message: 'Invoice drafted locally. Fee invoice API is not available on the server yet.',
        };
      }
    },
  });
}

/**
 * Generate invoices for many students in one action.
 * Tries studentIds[] bulk payload first, then per-student generate.
 */
export async function generateFeeInvoicesForStudents(basePayload, studentIds = []) {
  const ids = [...new Set((studentIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    throw new Error('Select at least one student.');
  }

  if (ids.length > 1) {
    try {
      const body = {
        ...basePayload,
        studentIds: ids,
        studentId: undefined,
        idempotencyKey: basePayload.idempotencyKey || `invoice-batch-${ids.length}-${basePayload.dueDate || 'na'}`,
      };
      if (body.feeStructureId && String(body.feeStructureId).startsWith('fs-default')) {
        delete body.feeStructureId;
      }
      return await api.post('/admin/fees/invoices/generate', body);
    } catch (err) {
      const status = Number(err?.status || 0);
      if (![400, 404, 405, 422].includes(status)) throw err;
    }
  }

  const results = [];
  const errors = [];
  for (const studentId of ids) {
    try {
      const data = await generateFeeInvoice({
        ...basePayload,
        studentId,
        studentIds: undefined,
        idempotencyKey: `invoice-${studentId}-${basePayload.dueDate || 'na'}`,
      });
      results.push({ studentId, data });
    } catch (err) {
      errors.push({ studentId, message: err?.message || 'Failed' });
    }
  }

  if (!results.length) {
    throw new Error(errors[0]?.message || 'Unable to generate invoices.');
  }

  return {
    savedCount: results.length,
    failedCount: errors.length,
    results,
    errors,
    invoices: results.map((r) => r.data),
    // Keep last invoice handy for checkout/refund UI
    id: results[results.length - 1]?.data?.id,
    net: results[results.length - 1]?.data?.net,
    status: results[results.length - 1]?.data?.status,
    message: errors.length
      ? `Generated ${results.length} invoice(s); ${errors.length} failed.`
      : `Generated invoices for ${results.length} student(s).`,
  };
}

/**
 * POST /admin/fees/reminders/schedule
 */
export async function scheduleFeeReminders(payload) {
  return routeRequest({
    mockFn: async () => {
      await delay(120);
      return {
        scheduled: true,
        daysBeforeDue: Number(payload.daysBeforeDue || payload.reminderDays || 3),
        classId: payload.classId || null,
        studentId: payload.studentId || null,
        invoiceId: payload.invoiceId || null,
        message: `Reminders scheduled ${payload.daysBeforeDue || payload.reminderDays || 3} days before due date.`,
      };
    },
    apiFn: () => api.post('/admin/fees/reminders/schedule', payload),
  });
}

/**
 * POST /admin/fees/refunds
 */
export async function processFeeRefund(payload) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const amount = Number(payload.amount || 0);
      if (amount <= 0) {
        const err = new Error('Refund amount must be greater than zero.');
        err.status = 400;
        throw err;
      }
      return {
        id: makeId('refund'),
        invoiceId: payload.invoiceId || null,
        studentId: payload.studentId || null,
        amount,
        status: 'queued',
        reason: payload.reason || '',
        message: `Refund of ₹${amount.toLocaleString('en-IN')} queued.`,
      };
    },
    apiFn: () => api.post('/admin/fees/refunds', payload),
  });
}

/**
 * POST /admin/fees/payments/checkout
 */
export async function createFeeCheckout(payload) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      return {
        checkoutId: makeId('chk'),
        invoiceId: payload.invoiceId,
        gateway: payload.gateway || 'razorpay',
        amount: Number(payload.amount || 0),
        currency: 'INR',
        status: 'created',
        message: 'Checkout session created.',
      };
    },
    apiFn: () => api.post('/admin/fees/payments/checkout', payload),
  });
}

/** GET /parent/fees — parent-facing fee list */
export async function listParentFees(params = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return readInvoices().filter((inv) => (
        !params.studentId || String(inv.studentId) === String(params.studentId)
      ));
    },
    apiFn: async () => asList(await api.get('/parent/fees', params)),
  });
}
