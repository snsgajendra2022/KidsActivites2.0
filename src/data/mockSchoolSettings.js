export const INITIAL_SCHOOL_SETTINGS = {
  academicYear: '2026–2027',
  admissionsOpen: true,
  enrollmentDeadline: '2026-07-31',
  admissionStartDate: '2026-04-01',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  lateFeePercent: 2,
  gracePeriodDays: 7,
  documents: {
    requireParentId: true,
    maxUploadSizeMb: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  notifications: {
    emailOnApplicationSubmitted: true,
    emailOnFeeVerified: true,
    smsOnAdmissionConfirmed: true,
    dailyDigest: false,
    parentPhotoAlerts: true,
  },
  updatedAt: '2026-06-01T08:00:00Z',
  updatedBy: 'Priya Sharma',
};
