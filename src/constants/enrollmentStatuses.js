export const ENROLLMENT_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CORRECTION_REQUIRED: 'correction_required',
  DOCUMENTS_PENDING: 'documents_pending',
  DOCUMENTS_VERIFIED: 'documents_verified',
  FEE_PENDING: 'fee_pending',
  FEE_SUBMITTED: 'fee_submitted',
  FEE_VERIFIED: 'fee_verified',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACCOUNT_CREATED: 'account_created',
  ADMISSION_CONFIRMED: 'admission_confirmed',
};

export const STATUS_LABELS = {
  [ENROLLMENT_STATUSES.DRAFT]: 'Draft',
  [ENROLLMENT_STATUSES.SUBMITTED]: 'Submitted',
  [ENROLLMENT_STATUSES.UNDER_REVIEW]: 'Under Review',
  [ENROLLMENT_STATUSES.CORRECTION_REQUIRED]: 'Correction Required',
  [ENROLLMENT_STATUSES.DOCUMENTS_PENDING]: 'Documents Pending',
  [ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED]: 'Documents Verified',
  [ENROLLMENT_STATUSES.FEE_PENDING]: 'Fee Pending',
  [ENROLLMENT_STATUSES.FEE_SUBMITTED]: 'Fee Submitted',
  [ENROLLMENT_STATUSES.FEE_VERIFIED]: 'Fee Verified',
  [ENROLLMENT_STATUSES.APPROVED]: 'Approved',
  [ENROLLMENT_STATUSES.REJECTED]: 'Rejected',
  [ENROLLMENT_STATUSES.ACCOUNT_CREATED]: 'Account Created',
  [ENROLLMENT_STATUSES.ADMISSION_CONFIRMED]: 'Admission Confirmed',
};

export const STATUS_BADGE_CLASS = {
  [ENROLLMENT_STATUSES.DRAFT]: 'badge-draft',
  [ENROLLMENT_STATUSES.SUBMITTED]: 'badge-submitted',
  [ENROLLMENT_STATUSES.UNDER_REVIEW]: 'badge-review',
  [ENROLLMENT_STATUSES.CORRECTION_REQUIRED]: 'badge-correction',
  [ENROLLMENT_STATUSES.DOCUMENTS_PENDING]: 'badge-docs-pending',
  [ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED]: 'badge-docs-verified',
  [ENROLLMENT_STATUSES.FEE_PENDING]: 'badge-fee-pending',
  [ENROLLMENT_STATUSES.FEE_SUBMITTED]: 'badge-fee-submitted',
  [ENROLLMENT_STATUSES.FEE_VERIFIED]: 'badge-fee-verified',
  [ENROLLMENT_STATUSES.APPROVED]: 'badge-approved',
  [ENROLLMENT_STATUSES.REJECTED]: 'badge-rejected',
  [ENROLLMENT_STATUSES.ACCOUNT_CREATED]: 'badge-account',
  [ENROLLMENT_STATUSES.ADMISSION_CONFIRMED]: 'badge-confirmed',
};

export const ENROLLMENT_STEPS = [
  'Student Details',
  'Parent / Guardian Details',
  'Address Details',
  'Academic Details',
  'Medical & Emergency',
  'Required Documents',
  'Declaration & Signature',
  'Review & Submit',
];
