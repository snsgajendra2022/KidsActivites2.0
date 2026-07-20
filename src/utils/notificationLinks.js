const ADMIN_ROLE_SET = new Set([
  'super_admin', 'school_admin', 'admission_officer', 'accountant', 'support_staff',
]);

/** App-relative message/chat route for a given role. */
export function messagesRouteForRole(role) {
  if (role === 'parent' || role === 'student') return '/parent/messages';
  if (role === 'teacher') return '/teacher/messages';
  return '/admin/chat';
}

const ROLE_DISPLAY = {
  super_admin: 'Admin',
  school_admin: 'Admin',
  admission_officer: 'Admin',
  accountant: 'Accounts',
  support_staff: 'Support',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
  admin: 'Admin',
};

function prettifyRole(role) {
  if (!role || typeof role !== 'string') return null;
  return ROLE_DISPLAY[role.toLowerCase()] || role;
}

/** Pull a sender/actor display name (or role) from whatever field the backend provides. */
export function getNotificationSender(n) {
  if (!n) return null;
  const name =
    n.senderName || n.actorName || n.fromName || n.createdByName
    || (typeof n.sender === 'string' ? n.sender : n.sender?.name)
    || (typeof n.actor === 'string' ? n.actor : n.actor?.name)
    || (typeof n.from === 'string' ? n.from : n.from?.name)
    || n.data?.senderName || n.data?.sender?.name || n.data?.actorName
    || n.metadata?.senderName || n.metadata?.sender?.name
    || null;
  if (name) return name;

  const role =
    n.senderRole || n.actorRole || n.sender?.role || n.actor?.role
    || n.data?.senderRole || n.data?.sender?.role
    || n.metadata?.senderRole || null;
  return prettifyRole(role);
}

/**
 * Notification title with the sender appended in parentheses when known,
 * e.g. "New Message (Admin)". Falls back to the plain title.
 */
export function getNotificationTitle(n) {
  if (!n) return '';
  const sender = getNotificationSender(n);
  return sender ? `${n.title} (${sender})` : n.title;
}

/** A conversation id if the notification references a chat thread. */
export function getConversationId(n) {
  if (!n) return null;
  return (
    n.conversationId || n.threadId || n.chatId
    || n.data?.conversationId || n.data?.threadId
    || n.metadata?.conversationId || n.metadata?.threadId
    || null
  );
}

/**
 * Resolve where a notification should navigate when clicked, as an
 * app-relative path (tenant prefix is applied by the caller). Works for
 * every role; returns null when there is no meaningful destination.
 */
export function resolveNotificationPath(n, role) {
  if (!n) return null;
  const explicit = n.webRoute || n.link || n.actionUrl || n.url || n.data?.link || n.data?.webRoute;
  if (typeof explicit === 'string' && explicit.startsWith('/')) return explicit;

  const isParent = role === 'parent' || role === 'student';
  const isTeacher = role === 'teacher';
  const isAdmin = ADMIN_ROLE_SET.has(role);
  const type = typeof n.type === 'string' ? n.type.toUpperCase() : '';

  switch (n.type) {
    case 'chat':
    case 'CHAT_MESSAGE': {
      const base = messagesRouteForRole(role);
      const cid = getConversationId(n)
        || (n.entityType === 'conversation' || type === 'CHAT_MESSAGE' ? n.entityId : null);
      return cid ? `${base}?c=${encodeURIComponent(cid)}` : base;
    }
    case 'fee':
    case 'FEE_PENDING':
      if (isParent) return '/parent/fees';
      if (isAdmin) return '/admin/fees';
      return null;
    case 'photo':
    case 'PHOTO_UPLOADED':
    case 'ALBUM_CREATED':
      if (isParent) return '/parent/photos';
      if (isTeacher) return '/teacher/photos';
      if (isAdmin) return '/admin/photos';
      return null;
    case 'enrollment':
    case 'APPLICATION_SUBMITTED':
    case 'APPLICATION_STATUS_CHANGED':
      if (isAdmin) return '/admin/applications';
      if (isParent) return '/parent/enrollment';
      return null;
    default:
      if (type === 'CHAT_MESSAGE' || type === 'CHAT') {
        const base = messagesRouteForRole(role);
        const cid = getConversationId(n) || n.entityId;
        return cid ? `${base}?c=${encodeURIComponent(cid)}` : base;
      }
      return null;
  }
}
