import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';

const PRE_APPROVAL_STATUSES = new Set([
  ENROLLMENT_STATUSES.SUBMITTED,
  ENROLLMENT_STATUSES.UNDER_REVIEW,
  ENROLLMENT_STATUSES.DOCUMENTS_PENDING,
  ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED,
  ENROLLMENT_STATUSES.CORRECTION_REQUIRED,
]);

const TERMINAL_STATUSES = new Set([
  ENROLLMENT_STATUSES.REJECTED,
  ENROLLMENT_STATUSES.ADMISSION_CONFIRMED,
]);

const POST_APPROVAL_STATUSES = new Set([
  ENROLLMENT_STATUSES.APPROVED,
  ENROLLMENT_STATUSES.FEE_PENDING,
  ENROLLMENT_STATUSES.FEE_SUBMITTED,
  ENROLLMENT_STATUSES.FEE_VERIFIED,
]);

function hasAssignedFee(fee) {
  if (!fee) return false;
  if (fee.status === 'not_assigned') return false;
  return Boolean(fee.breakdown) && Number(fee.total || 0) > 0;
}

/**
 * Workflow order for admin application actions (early review → fee → account → admission).
 */
export const ADMIN_ACTION_ORDER = [
  'requestCorrection',
  'verifyDocuments',
  'approve',
  'reject',
  'assignFee',
  'verifyPayment',
  'rejectPayment',
  'createAccount',
  'confirmAdmission',
];

/**
 * Returns which admin actions are available for the current application status and fee record.
 */
export function getAdminActionAvailability(status, fee = null) {
  if (TERMINAL_STATUSES.has(status)) {
    return {
      requestCorrection: false,
      verifyDocuments: false,
      approve: false,
      reject: false,
      assignFee: false,
      verifyPayment: false,
      rejectPayment: false,
      createAccount: false,
      confirmAdmission: false,
      isTerminal: true,
      hasAnyAction: false,
    };
  }

  const preApproval = PRE_APPROVAL_STATUSES.has(status);
  const paymentSubmitted = fee?.status === 'payment_submitted';
  const assigned = hasAssignedFee(fee);

  const availability = {
    requestCorrection: preApproval,
    verifyDocuments: preApproval && status !== ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED,
    approve: preApproval,
    reject: preApproval,
    assignFee: status === ENROLLMENT_STATUSES.APPROVED
      || (status === ENROLLMENT_STATUSES.FEE_PENDING && !assigned),
    verifyPayment: paymentSubmitted,
    rejectPayment: paymentSubmitted,
    createAccount: (POST_APPROVAL_STATUSES.has(status) || status === ENROLLMENT_STATUSES.FEE_VERIFIED)
      && status !== ENROLLMENT_STATUSES.ACCOUNT_CREATED,
    confirmAdmission: status === ENROLLMENT_STATUSES.ACCOUNT_CREATED
      || status === ENROLLMENT_STATUSES.FEE_VERIFIED,
    isTerminal: false,
  };

  availability.hasAnyAction = ADMIN_ACTION_ORDER.some((key) => availability[key]);

  return availability;
}
