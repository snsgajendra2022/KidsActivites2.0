import { INITIAL_FEES, calculateTotal } from '../data/mockFees.js';
import { delay, getStore, setStore } from './mockApi.js';
import { updateApplicationStatus } from './enrollmentService.js';
import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const KEY = 'sb_fees';

function normalizeFeeStatus(status) {
  if (status == null || status === '') return status;
  const raw = String(status).trim();
  const lower = raw.toLowerCase();
  const aliases = {
    pending: 'fee_pending',
    assigned: 'fee_pending',
    fee_assigned: 'fee_pending',
    awaiting_payment: 'fee_pending',
    payment_pending: 'fee_pending',
    submitted: 'payment_submitted',
    payment_proof_submitted: 'payment_submitted',
    paid: 'verified',
    approved: 'verified',
    fee_verified: 'verified',
    unassigned: 'not_assigned',
  };
  return aliases[lower] || lower;
}

function normalizeBreakdown(fee) {
  if (fee?.breakdown && typeof fee.breakdown === 'object' && !Array.isArray(fee.breakdown)) {
    return fee.breakdown;
  }
  const lines = fee?.lineItems || fee?.items || fee?.heads || fee?.feeHeads;
  if (Array.isArray(lines) && lines.length) {
    return lines.reduce((acc, line, index) => {
      const key = line.key || line.code || line.name || line.label || `item_${index + 1}`;
      acc[key] = Number(line.amount ?? line.value ?? line.net ?? 0);
      return acc;
    }, {});
  }
  return fee?.breakdown || null;
}

function normalizeFee(fee) {
  if (!fee) return fee;
  const applicationId = fee.applicationId
    ?? fee.application_id
    ?? fee.application?.id
    ?? null;
  const applicationNo = fee.applicationNo
    ?? fee.application_no
    ?? fee.application?.applicationNo
    ?? null;
  const studentName = fee.studentName
    ?? fee.student_name
    ?? fee.application?.student?.fullName
    ?? fee.student?.fullName
    ?? fee.studentName
    ?? null;
  const classApplying = fee.classApplying
    ?? fee.class_applying
    ?? fee.application?.student?.classApplying
    ?? fee.student?.classApplying
    ?? null;
  const breakdown = normalizeBreakdown(fee);
  const total = fee.total != null
    ? Number(fee.total)
    : (fee.netAmount != null
      ? Number(fee.netAmount)
      : (fee.amount != null ? Number(fee.amount) : (fee.gross != null ? Number(fee.gross) : 0)));
  return {
    ...fee,
    id: fee.id ?? fee.feeId ?? fee.invoiceId ?? null,
    applicationId: applicationId != null ? String(applicationId) : null,
    applicationNo,
    studentName,
    classApplying,
    status: normalizeFeeStatus(fee.status),
    total,
    breakdown,
    payment: fee.payment || null,
  };
}

function normalizeFeeList(data) {
  if (!data) return [];
  const list = Array.isArray(data)
    ? data
    : (data.items || data.content || data.fees || data.records || []);
  return Array.isArray(list) ? list.map(normalizeFee) : [];
}

function isMissingRouteError(err) {
  const status = Number(err?.status || 0);
  return status === 404 || status === 405;
}

async function postFirstAvailable(paths, body) {
  let lastErr;
  for (const path of paths) {
    try {
      return await api.post(path, body);
    } catch (err) {
      lastErr = err;
      if (!isMissingRouteError(err)) throw err;
    }
  }
  throw lastErr || new Error('Fee payment endpoint is not available on the server.');
}

function getAll() {
  return getStore(KEY, INITIAL_FEES);
}

function saveAll(fees) {
  setStore(KEY, fees);
}

async function mockGetFees(filters = {}) {
  await delay();
  let fees = getAll();
  if (filters.applicationId) fees = fees.filter((f) => f.applicationId === filters.applicationId);
  if (filters.status) fees = fees.filter((f) => f.status === filters.status);
  return fees;
}

export async function getFees(filters = {}) {
  return routeRequest({
    mockFn: () => mockGetFees(filters).then(normalizeFeeList),
    apiFn: async () => normalizeFeeList(await api.get('/admin/fees', filters)),
  });
}

export async function getFeeById(feeId) {
  if (!feeId) return null;
  return routeRequest({
    mockFn: async () => {
      await delay();
      const fee = getAll().find((f) => f.id === feeId) || null;
      return normalizeFee(fee);
    },
    apiFn: async () => normalizeFee(await api.get(`/admin/fees/${feeId}`)),
  });
}

export async function getFeeByApplication(applicationId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const fee = getAll().find((f) => f.applicationId === applicationId) || null;
      return normalizeFee(fee);
    },
    apiFn: async () => {
      const fees = await api.get('/admin/fees', { applicationId });
      const list = normalizeFeeList(fees);
      return list.length > 0 ? list[0] : null;
    },
  });
}

function pickParentFeeFromList(list, applicationId) {
  const fees = normalizeFeeList(list).filter(Boolean);
  if (!fees.length) return null;
  if (applicationId) {
    const match = fees.find((f) => String(f.applicationId) === String(applicationId));
    if (match) return match;
  }
  const assigned = fees.find((f) => f.status && f.status !== 'not_assigned' && (f.breakdown || f.total > 0));
  return assigned || fees[0] || null;
}

/** Parent-safe fee lookup for the logged-in parent's application. */
export async function getMyFee(applicationId, user) {
  return routeRequest({
    user,
    mockFn: async () => {
      await delay();
      const fees = getAll();
      const fee = applicationId
        ? (fees.find((f) => String(f.applicationId) === String(applicationId)) || null)
        : (fees.find((f) => f.status && f.status !== 'not_assigned') || fees[0] || null);
      return normalizeFee(fee);
    },
    apiFn: async () => {
      const params = applicationId ? { applicationId } : {};
      try {
        const data = await api.get('/fees/my-fee', params);
        if (Array.isArray(data)) return pickParentFeeFromList(data, applicationId);
        if (data?.fee) return normalizeFee(data.fee);
        if (data?.items || data?.content || data?.fees) {
          return pickParentFeeFromList(data, applicationId);
        }
        return normalizeFee(data);
      } catch (err) {
        const status = Number(err?.status || 0);
        // Parents must never use /admin/fees — fall back to parent-scoped list.
        if (status !== 404 && status !== 403 && status !== 405) throw err;
        try {
          return pickParentFeeFromList(await api.get('/parent/fees', params), applicationId);
        } catch (fallbackErr) {
          if (status === 404 || Number(fallbackErr?.status) === 404) return null;
          throw err;
        }
      }
    },
  });
}

export async function assignFee(applicationId, applicationNo, studentName, classApplying, breakdown) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const fees = getAll();
      const existing = fees.find((f) => f.applicationId === applicationId);
      const entry = {
        id: existing?.id || `fee-${Date.now()}`,
        applicationId,
        applicationNo,
        studentName,
        classApplying,
        status: 'fee_pending',
        breakdown,
        total: calculateTotal(breakdown),
        payment: null,
      };
      if (existing) {
        const idx = fees.findIndex((f) => f.applicationId === applicationId);
        fees[idx] = entry;
      } else {
        fees.push(entry);
      }
      saveAll(fees);
      await updateApplicationStatus(applicationId, ENROLLMENT_STATUSES.FEE_PENDING, 'Fee structure assigned');
      return entry;
    },
    apiFn: async () => normalizeFee(await api.post(`/admin/applications/${applicationId}/assign-fee`, { breakdown })),
  });
}

export async function submitPayment(feeId, payment) {
  return routeRequest({
    mockFn: async () => {
      await delay(600);
      const fees = getAll();
      const idx = fees.findIndex((f) => f.id === feeId);
      if (idx < 0) throw new Error('Fee record not found');
      fees[idx].status = 'payment_submitted';
      fees[idx].payment = { ...payment, submittedAt: new Date().toISOString() };
      saveAll(fees);
      await updateApplicationStatus(fees[idx].applicationId, ENROLLMENT_STATUSES.FEE_SUBMITTED, 'Payment proof submitted');
      return fees[idx];
    },
    apiFn: async () => normalizeFee(await api.post(`/fees/${feeId}/submit-payment`, payment)),
  });
}

/** Admin records payment on behalf of parent (e.g. cash at office). */
export async function submitAdminPayment(feeId, payment) {
  return routeRequest({
    mockFn: () => submitPayment(feeId, payment),
    apiFn: async () => normalizeFee(await postFirstAvailable([
      // Preferred admin cash / office collection endpoint
      `/admin/fees/${feeId}/record-payment`,
      // Legacy alias some backends expose
      `/admin/fees/${feeId}/submit-payment`,
      // Parent submit path (allowed on some gateways for staff too)
      `/fees/${feeId}/submit-payment`,
    ], payment)),
  });
}

/** Record payment and mark fee as verified in one admin action. */
export async function recordAdminFeePayment(feeId, payment, verifiedBy) {
  const current = await getFeeById(feeId);
  if (!current) throw new Error('Fee record not found');
  if (current.status === 'verified') {
    throw new Error('This fee is already marked as paid.');
  }

  return routeRequest({
    mockFn: async () => {
      if (current.status !== 'payment_submitted') {
        await submitPayment(feeId, payment);
      }
      return verifyPayment(feeId, verifiedBy, { note: payment?.note });
    },
    apiFn: async () => {
      const officePayload = {
        verifiedBy,
        method: payment?.method,
        transactionId: payment?.transactionId,
        amount: payment?.amount,
        note: payment?.note,
        payment,
      };

      // 1) One-shot admin record + verify (cash at office)
      try {
        return normalizeFee(await api.post(`/admin/fees/${feeId}/record-payment`, officePayload));
      } catch (err) {
        if (!isMissingRouteError(err)) throw err;
      }

      // 2) Already submitted by parent → verify only
      if (current.status === 'payment_submitted') {
        return normalizeFee(await api.post(`/admin/fees/${feeId}/verify`, {
          verifiedBy,
          note: payment?.note,
        }));
      }

      // 3) Some backends accept payment fields directly on verify for office collection
      try {
        return normalizeFee(await api.post(`/admin/fees/${feeId}/verify`, officePayload));
      } catch (err) {
        // If verify rejects unpaid fees, fall through to submit → verify
        const status = Number(err?.status || 0);
        if (![400, 409, 422].includes(status)) throw err;
      }

      // 4) Two-step: submit proof, then verify
      await submitAdminPayment(feeId, payment);
      return normalizeFee(await api.post(`/admin/fees/${feeId}/verify`, {
        verifiedBy,
        note: payment?.note,
      }));
    },
  });
}

export async function verifyPayment(feeId, verifiedBy, extras = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const fees = getAll();
      const idx = fees.findIndex((f) => f.id === feeId);
      if (idx < 0) throw new Error('Fee record not found');
      fees[idx].status = 'verified';
      fees[idx].payment = {
        ...fees[idx].payment,
        verifiedAt: new Date().toISOString(),
        verifiedBy,
        receiptNo: `RCP-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      };
      saveAll(fees);
      await updateApplicationStatus(fees[idx].applicationId, ENROLLMENT_STATUSES.FEE_VERIFIED, 'Payment verified');
      return fees[idx];
    },
    apiFn: async () => normalizeFee(await api.post(`/admin/fees/${feeId}/verify`, {
      verifiedBy,
      ...extras,
    })),
  });
}

export async function rejectPayment(feeId, reason) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const fees = getAll();
      const idx = fees.findIndex((f) => f.id === feeId);
      if (idx < 0) throw new Error('Fee record not found');
      fees[idx].status = 'fee_pending';
      fees[idx].payment = {
        ...fees[idx].payment,
        rejectedReason: reason,
        rejectedAt: new Date().toISOString(),
      };
      saveAll(fees);
      return fees[idx];
    },
    apiFn: async () => normalizeFee(await api.post(`/admin/fees/${feeId}/reject`, { reason })),
  });
}

export { calculateTotal, normalizeFee };
