import { calculateTotal } from './mockFees.js';

const BASE = {
  admissionFee: 15000,
  registrationFee: 5000,
  tuitionFee: 42000,
  transportFee: 10000,
  activityFee: 3000,
  discount: 0,
};

function structure(id, classApplying, label, overrides = {}) {
  const breakdown = { ...BASE, ...overrides };
  return {
    id,
    classApplying,
    label,
    breakdown,
    total: calculateTotal(breakdown),
    active: true,
    updatedAt: '2026-06-01T10:00:00Z',
    updatedBy: 'Priya Sharma',
  };
}

export const INITIAL_FEE_STRUCTURES = [
  structure('fs-nursery', 'nursery', 'Nursery', { tuitionFee: 32000, transportFee: 8000 }),
  structure('fs-lkg', 'lkg', 'LKG', { tuitionFee: 36000, transportFee: 9000 }),
  structure('fs-ukg', 'ukg', 'UKG', { tuitionFee: 38000 }),
  structure('fs-1', '1', 'Class 1', { tuitionFee: 45000 }),
  structure('fs-2', '2', 'Class 2', { tuitionFee: 48000, activityFee: 3500 }),
];
