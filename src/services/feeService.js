import { INITIAL_FEES, calculateTotal } from '../data/mockFees.js';
import { delay, getStore, setStore } from './mockApi.js';
import { updateApplicationStatus } from './enrollmentService.js';
import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';

const KEY = 'sb_fees';

function getAll() {
  return getStore(KEY, INITIAL_FEES);
}

function saveAll(fees) {
  setStore(KEY, fees);
}

export async function getFees(filters = {}) {
  await delay();
  let fees = getAll();
  if (filters.applicationId) fees = fees.filter((f) => f.applicationId === filters.applicationId);
  if (filters.status) fees = fees.filter((f) => f.status === filters.status);
  return fees;
}

export async function getFeeByApplication(applicationId) {
  await delay();
  return getAll().find((f) => f.applicationId === applicationId) || null;
}

export async function assignFee(applicationId, applicationNo, studentName, classApplying, breakdown) {
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
}

export async function submitPayment(feeId, payment) {
  await delay(600);
  const fees = getAll();
  const idx = fees.findIndex((f) => f.id === feeId);
  if (idx < 0) throw new Error('Fee record not found');
  fees[idx].status = 'payment_submitted';
  fees[idx].payment = { ...payment, submittedAt: new Date().toISOString() };
  saveAll(fees);
  await updateApplicationStatus(fees[idx].applicationId, ENROLLMENT_STATUSES.FEE_SUBMITTED, 'Payment proof submitted');
  return fees[idx];
}

export async function verifyPayment(feeId, verifiedBy) {
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
}

export async function rejectPayment(feeId, reason) {
  await delay();
  const fees = getAll();
  const idx = fees.findIndex((f) => f.id === feeId);
  if (idx < 0) throw new Error('Fee record not found');
  fees[idx].status = 'fee_pending';
  fees[idx].payment = { ...fees[idx].payment, rejectedReason: reason, rejectedAt: new Date().toISOString() };
  saveAll(fees);
  return fees[idx];
}

export { calculateTotal };
