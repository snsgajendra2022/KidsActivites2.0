export const INITIAL_FEES = [
  {
    id: 'fee-001',
    applicationId: 'app-002',
    applicationNo: 'GVIS-2026-0002',
    studentName: 'Isha Patel',
    classApplying: '1',
    status: 'fee_pending',
    breakdown: {
      admissionFee: 15000,
      registrationFee: 5000,
      tuitionFee: 45000,
      transportFee: 12000,
      activityFee: 3000,
      discount: 5000,
    },
    total: 75000,
    payment: null,
  },
  {
    id: 'fee-002',
    applicationId: 'app-001',
    applicationNo: 'GVIS-2026-0001',
    studentName: 'Aarav Kumar',
    classApplying: 'ukg',
    status: 'not_assigned',
    breakdown: null,
    total: 0,
    payment: null,
  },
  {
    id: 'fee-003',
    applicationId: 'app-003',
    applicationNo: 'GVIS-2026-0003',
    studentName: 'Rohan Singh',
    classApplying: '2',
    status: 'verified',
    breakdown: {
      admissionFee: 15000,
      registrationFee: 5000,
      tuitionFee: 48000,
      transportFee: 0,
      activityFee: 3000,
      discount: 0,
    },
    total: 71000,
    payment: {
      method: 'Bank Transfer',
      transactionId: 'TXN20260528001',
      amount: 71000,
      submittedAt: '2026-05-28T11:00:00Z',
      verifiedAt: '2026-05-29T10:00:00Z',
      verifiedBy: 'Priya Sharma',
      receiptNo: 'RCP-2026-0042',
    },
  },
];

export function calculateTotal(breakdown) {
  if (!breakdown) return 0;
  const { admissionFee = 0, registrationFee = 0, tuitionFee = 0, transportFee = 0, activityFee = 0, discount = 0 } = breakdown;
  return admissionFee + registrationFee + tuitionFee + transportFee + activityFee - discount;
}
