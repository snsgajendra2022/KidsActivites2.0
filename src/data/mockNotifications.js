export const INITIAL_NOTIFICATIONS = [
  { id: 'n1', userId: 'u-parent', title: 'Application Submitted', message: 'Your enrollment application GVIS-2026-0001 has been submitted successfully.', type: 'enrollment', read: true, createdAt: '2026-06-15T10:30:00Z' },
  { id: 'n2', userId: 'u-parent', title: 'Under Review', message: 'Your application is now under review by the admission team.', type: 'enrollment', read: false, createdAt: '2026-06-16T09:00:00Z' },
  { id: 'n3', userId: 'u-parent', title: 'New Photo Shared', message: 'Ms. Anita Verma shared photos from art class.', type: 'photo', read: false, createdAt: '2026-06-20T10:00:00Z' },
  { id: 'n4', userId: 'u-admin', title: 'New Application', message: 'New enrollment application received from Aarav Kumar.', type: 'enrollment', read: false, createdAt: '2026-06-15T10:30:00Z' },
  { id: 'n5', userId: 'u-admin', title: 'Fee Payment Submitted', message: 'Payment proof submitted for GVIS-2026-0002.', type: 'fee', read: false, createdAt: '2026-06-14T16:00:00Z' },
  { id: 'n6', userId: 'u-teacher', title: 'New Message', message: 'Rajesh Kumar sent you a message.', type: 'chat', read: false, createdAt: '2026-06-20T11:30:00Z' },
];
