export const INITIAL_NOTIFICATIONS = [
  { id: 'n1', userId: 'usr-parent', title: 'Application Submitted', message: 'Your enrollment application GVIS-2026-0001 has been submitted successfully.', type: 'enrollment', read: true, createdAt: '2026-06-15T10:30:00Z' },
  { id: 'n2', userId: 'usr-parent', title: 'Under Review', message: 'Your application is now under review by the admission team.', type: 'enrollment', read: false, createdAt: '2026-06-16T09:00:00Z' },
  { id: 'n3', userId: 'usr-parent', title: 'New Photo Shared', message: 'Ms. Meera Iyer shared photos from art class.', type: 'photo', read: false, createdAt: '2026-06-20T10:00:00Z' },
  { id: 'n4', userId: 'usr-school-admin', title: 'New Application', message: 'New enrollment application received from Aarav Kumar.', type: 'enrollment', read: false, createdAt: '2026-06-15T10:30:00Z' },
  { id: 'n5', userId: 'usr-school-admin', title: 'Fee Payment Submitted', message: 'Payment proof submitted for GVIS-2026-0002.', type: 'fee', read: false, createdAt: '2026-06-14T16:00:00Z' },
  { id: 'n6', userId: 'usr-teacher', title: 'New Message', message: 'Rajesh Kumar sent you a message.', type: 'chat', read: false, createdAt: '2026-06-20T11:30:00Z' },
  { id: 'n7', userId: 'usr-accountant', title: 'Payment Pending Verification', message: 'A new fee payment proof awaits verification.', type: 'fee', read: false, createdAt: '2026-06-14T16:05:00Z' },
];
