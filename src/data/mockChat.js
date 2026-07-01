export const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-001',
    participants: ['usr-parent', 'usr-teacher'],
    participantNames: { 'usr-parent': 'Rajesh Kumar', 'usr-teacher': 'Meera Iyer' },
    lastMessage: 'Thank you for the update about Aarav.',
    lastMessageAt: '2026-06-20T11:30:00Z',
    unread: { 'usr-parent': 0, 'usr-teacher': 1 },
    role: 'teacher',
  },
  {
    id: 'conv-002',
    participants: ['usr-parent', 'usr-school-admin'],
    participantNames: { 'usr-parent': 'Rajesh Kumar', 'usr-school-admin': 'Priya Sharma' },
    lastMessage: 'Your documents are under review.',
    lastMessageAt: '2026-06-16T09:15:00Z',
    unread: { 'usr-parent': 1, 'usr-school-admin': 0 },
    role: 'admin',
  },
];

export const INITIAL_MESSAGES = {
  'conv-001': [
    { id: 'm1', senderId: 'usr-teacher', text: 'Hello Mr. Kumar, Aarav did wonderfully in art class today!', sentAt: '2026-06-20T10:00:00Z' },
    { id: 'm2', senderId: 'usr-parent', text: 'That is great to hear! Thank you for sharing.', sentAt: '2026-06-20T10:15:00Z' },
    { id: 'm3', senderId: 'usr-teacher', text: 'I have shared some photos in the gallery.', sentAt: '2026-06-20T10:30:00Z' },
    { id: 'm4', senderId: 'usr-parent', text: 'Thank you for the update about Aarav.', sentAt: '2026-06-20T11:30:00Z' },
  ],
  'conv-002': [
    { id: 'm5', senderId: 'usr-school-admin', text: 'We have received your enrollment application GVIS-2026-0001.', sentAt: '2026-06-15T11:00:00Z' },
    { id: 'm6', senderId: 'usr-parent', text: 'When can we expect the document verification?', sentAt: '2026-06-16T08:00:00Z' },
    { id: 'm7', senderId: 'usr-school-admin', text: 'Your documents are under review.', sentAt: '2026-06-16T09:15:00Z' },
  ],
};
