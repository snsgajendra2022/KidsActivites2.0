import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { EmptyState, LoadingState } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAccessToken } from '../../services/api/tokenStorage.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getConversationsForUser,
  getMessages,
  sendMessage,
  markConversationRead,
  getChatContacts,
  createConversation,
  uploadChatAttachment,
  editMessage,
  deleteMessage,
  toggleMessageReaction,
  getChatFeatureSupport,
  CHAT_ATTACHMENT_ACCEPT,
} from '../../services/chatService.js';
import {
  publishChatUnreadSnapshot,
  clearChatUnreadSnapshot,
  requestChatUnreadRefresh,
} from '../../hooks/useUnreadMessageCount.js';
import {
  subscribeToConversation,
  publishTyping,
  publishPresence,
} from '../../services/chatRealtime.js';
import { usePermission } from '../../hooks/usePermission.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  getConversationUnread,
  patchConversationUnread,
} from '../../utils/chatUnread.js';
import { attachmentPreviewText, normalizeChatMessage } from '../../utils/chatAttachments.js';
import ChatAttachmentView from '../../components/chat/ChatAttachmentView.jsx';
import {
  Send, MessageCircle, Search, ArrowLeft, Shield, Plus, X, Check, CheckCheck,
  Paperclip, FileText, Pencil, Trash2, RefreshCw, LoaderCircle,
} from 'lucide-react';
import '../../styles/messages.css';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getMessageDateKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatMessageDateLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function buildMessageTimeline(messages) {
  const timeline = [];
  let currentDateKey = null;
  messages.forEach((message) => {
    const dateKey = getMessageDateKey(message.sentAt);
    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey;
      timeline.push({
        type: 'date',
        key: `date-${dateKey}`,
        label: formatMessageDateLabel(message.sentAt),
      });
    }
    timeline.push({ type: 'message', key: message.id, message });
  });
  return timeline;
}

function getPageSubtitle(role) {
  if (role === 'parent' || role === 'student') return 'Chat securely with teachers and school staff';
  if (role === 'teacher') return 'Connect with parents and school administration';
  if (role === 'driver') return 'Chat with parents and school staff';
  return 'Secure messaging across your school community';
}

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getOtherParticipant(conv, userId) {
  return conv.participants.find((p) => p !== userId);
}

function roleLabel(role) {
  if (role === 'admin') return 'School administration';
  if (role === 'parent') return 'Parent';
  if (role === 'driver') return 'Driver';
  return 'Teacher';
}

function getTeacherParticipantLabel(conv, participantId) {
  if (!participantId) return { title: '', subtitle: '' };
  const parentName = conv.participantNames?.[participantId] || '';
  const studentNames = conv.participantStudentNames?.[participantId];
  if (studentNames) {
    return {
      title: studentNames,
      subtitle: parentName ? `Parent · ${parentName}` : 'Parent',
    };
  }
  return { title: parentName, subtitle: roleLabel(conv.role) };
}

function getTeacherContactLabel(contact) {
  if (contact.studentNames) {
    return {
      title: contact.studentNames,
      subtitle: contact.name ? `Parent · ${contact.name}` : 'Parent',
    };
  }
  return { title: contact.name || '', subtitle: roleLabel(contact.role) };
}

function applyReadReceipt(messages, readerId, readAt, currentUserId) {
  if (!readAt || readerId === currentUserId) return messages;
  const readTime = new Date(readAt).getTime();
  return messages.map((m) => (
    m.senderId === currentUserId && new Date(m.sentAt).getTime() <= readTime
      ? { ...m, seen: true }
      : m
  ));
}

const QUICK_REACTIONS = ['👍', '❤️', '🎉', '😊'];

function reactionUserIds(userIds = []) {
  return (Array.isArray(userIds) ? userIds : []).map(String);
}

function getUserReactionEmoji(reactions = {}, userId) {
  const uid = String(userId || '');
  if (!uid) return null;
  return Object.entries(reactions || {}).find(([, ids]) => reactionUserIds(ids).includes(uid))?.[0] || null;
}

function applyLocalReaction(reactions = {}, userId, emoji) {
  const uid = String(userId);
  const nextEmoji = String(emoji || '');
  const next = {};
  Object.entries(reactions || {}).forEach(([key, ids]) => {
    const filtered = reactionUserIds(ids).filter((id) => id !== uid);
    if (filtered.length) next[key] = filtered;
  });
  const alreadyOnTarget = reactionUserIds(reactions?.[nextEmoji]).includes(uid);
  if (!alreadyOnTarget && nextEmoji) {
    next[nextEmoji] = [...reactionUserIds(next[nextEmoji]), uid];
  }
  return next;
}

/** Keep other users from the server, but never let the current user own more than one emoji. */
function mergeReactionsKeepingMine(serverReactions, localReactions, userId) {
  const uid = String(userId);
  const merged = {};
  Object.entries(serverReactions || {}).forEach(([emoji, ids]) => {
    const filtered = reactionUserIds(ids).filter((id) => id !== uid);
    if (filtered.length) merged[emoji] = filtered;
  });
  Object.entries(localReactions || {}).forEach(([emoji, ids]) => {
    if (!reactionUserIds(ids).includes(uid)) return;
    merged[emoji] = [...reactionUserIds(merged[emoji]).filter((id) => id !== uid), uid];
  });
  return merged;
}

/** Display safety: if a user somehow appears on multiple emojis, keep only their latest. */
function reactionsForDisplay(reactions = {}, currentUserId) {
  const uid = String(currentUserId || '');
  if (!uid) return reactions || {};
  const mineEmojis = Object.entries(reactions || {})
    .filter(([, ids]) => reactionUserIds(ids).includes(uid))
    .map(([emoji]) => emoji);
  if (mineEmojis.length <= 1) return reactions || {};
  const keep = mineEmojis[mineEmojis.length - 1];
  const next = {};
  Object.entries(reactions || {}).forEach(([emoji, ids]) => {
    const list = reactionUserIds(ids).filter((id) => id !== uid || emoji === keep);
    if (list.length) next[emoji] = list;
  });
  return next;
}

function conversationPreview(message) {
  return message?.text || attachmentPreviewText(message);
}

export default function ChatPage() {
  const { user, bootstrapping } = useAuth();
  const { toast } = useToast();
  const canSendMessages = usePermission(PERMISSIONS.SEND_MESSAGES);
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [conversationError, setConversationError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [contactError, setContactError] = useState('');
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [olderCursor, setOlderCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [deletingSelection, setDeletingSelection] = useState(false);
  const [typingUserId, setTypingUserId] = useState(null);
  const [participantPresence, setParticipantPresence] = useState(null);
  const [featureSupport, setFeatureSupport] = useState(() => getChatFeatureSupport());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const composeModalRef = useRef(null);
  const contactSearchRef = useRef(null);
  const composeTriggerRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const deleteCancelRef = useRef(null);
  const threadBodyRef = useRef(null);
  const sendButtonRef = useRef(null);
  const sendLockRef = useRef(false);
  const inputValueRef = useRef('');
  const lastSendFingerprintRef = useRef({ key: '', at: 0 });
  const typingTimerRef = useRef(null);
  const remoteTypingTimerRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConvId = searchParams.get('c');

  const activeRef = useRef(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const loadConversations = useCallback(() => {
    if (bootstrapping || !user?.id || !getAccessToken()) return Promise.resolve();
    setLoadingConversations(true);
    setConversationError('');
    return getConversationsForUser(user.id)
      .then((list) => {
        const items = Array.isArray(list) ? list : [];
        setConversations(items);
        if (items.length && !active) {
          setActive(items[0].id);
        }
      })
      .catch((error) => {
        setConversationError(error?.message || 'Unable to load conversations.');
        setConversations([]);
      })
      .finally(() => setLoadingConversations(false));
  }, [user?.id, bootstrapping]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id) return undefined;
    publishChatUnreadSnapshot(conversations, user.id);
    return () => {
      clearChatUnreadSnapshot();
      requestChatUnreadRefresh();
    };
  }, [conversations, user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadConversations(), 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  // Deep-link: open a specific conversation when arriving from a notification.
  useEffect(() => {
    if (!requestedConvId || conversations.length === 0) return;
    const timer = window.setTimeout(() => {
      if (conversations.some((c) => c.id === requestedConvId)) {
        setActive(requestedConvId);
        setMobileChatOpen(true);
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('c');
          return next;
        },
        { replace: true },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedConvId, conversations, setSearchParams]);

  const loadMessages = useCallback(async (conversationId, { older = false } = {}) => {
    if (!conversationId) return;
    if (older) setLoadingOlder(true);
    else {
      setLoadingMessages(true);
      setMessageError('');
    }
    try {
      const page = await getMessages(conversationId, {
        limit: 30,
        before: older ? olderCursor : undefined,
      });
      const items = Array.isArray(page) ? page : page.items || [];
      setMessages((current) => {
        if (!older) return items;
        const existing = new Set(current.map((message) => message.id));
        return [...items.filter((message) => !existing.has(message.id)), ...current];
      });
      setHasOlderMessages(Boolean(page?.hasMore));
      setOlderCursor(page?.nextCursor || null);
    } catch (error) {
      setMessageError(error?.message || 'Unable to load messages.');
      if (!older) setMessages([]);
    } finally {
      setLoadingMessages(false);
      setLoadingOlder(false);
    }
  }, [olderCursor]);

  useEffect(() => {
    if (!active || !user?.id) return undefined;
    const timer = window.setTimeout(() => {
      setMessages([]);
      setAttachments([]);
      setPendingUploads([]);
      setEditingMessageId(null);
      setSelectedIds([]);
      setPendingDeleteIds([]);
      setTypingUserId(null);
      setParticipantPresence(null);
      setOlderCursor(null);
      setHasOlderMessages(false);
      void loadMessages(active);

      markConversationRead(active, user.id)
        .then(() => {
          setConversations((prev) => prev.map((c) => (
            c.id === active ? patchConversationUnread(c, user.id, 0) : c
          )));
          requestChatUnreadRefresh();
        })
        .catch(() => {});
    }, 0);

    return () => {
      window.clearTimeout(timer);
      publishTyping(active, false);
    };
  }, [active, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const conversationIdsKey = useMemo(
    () => conversations.map((c) => c.id).sort().join(','),
    [conversations],
  );

  useEffect(() => {
    if (bootstrapping || !user?.id || !getAccessToken() || !conversationIdsKey) return undefined;

    const conversationIds = conversationIdsKey.split(',');
    const unsubs = conversationIds.map((conversationId) => subscribeToConversation(conversationId, (payload) => {
      if (payload?.event === 'message:new' && payload.message) {
        const msg = normalizeChatMessage(payload.message);
        const isActive = activeRef.current === conversationId;

        if (isActive) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.senderId !== user.id) {
            markConversationRead(conversationId, user.id).catch(() => {});
          }
        }

        setConversations((prev) => prev.map((c) => {
          if (c.id !== conversationId) return c;
          const unreadCount = getConversationUnread(c, user.id);
          const nextUnread = isActive || msg.senderId === user.id ? 0 : unreadCount + 1;
          return patchConversationUnread(
            {
              ...c,
              lastMessage: conversationPreview(msg),
              lastMessageAt: msg.sentAt,
              lastMessageSenderId: msg.senderId,
            },
            user.id,
            nextUnread,
          );
        }));
        requestChatUnreadRefresh();
        return;
      }

      if (['message:updated', 'message:deleted', 'message:reaction'].includes(payload?.event)) {
        const nextMessage = normalizeChatMessage(payload.message);
        if (nextMessage && activeRef.current === conversationId) {
          setMessages((prev) => prev.map((message) => (
            message.id === nextMessage.id ? { ...message, ...nextMessage } : message
          )));
        }
        return;
      }

      if (payload?.event === 'typing' && payload.userId !== user.id) {
        if (activeRef.current === conversationId) {
          setTypingUserId(payload.isTyping === false ? null : payload.userId);
          window.clearTimeout(remoteTypingTimerRef.current);
          if (payload.isTyping !== false) {
            remoteTypingTimerRef.current = window.setTimeout(() => setTypingUserId(null), 2500);
          }
        }
        return;
      }

      if (payload?.event === 'presence:update' && payload.userId !== user.id) {
        if (activeRef.current === conversationId) {
          setParticipantPresence({
            status: payload.status || 'offline',
            lastSeenAt: payload.lastSeenAt || null,
          });
        }
        return;
      }

      if (payload?.event === 'conversation:read') {
        const { userId: readerId, readAt } = payload;
        if (activeRef.current === conversationId) {
          setMessages((prev) => applyReadReceipt(prev, readerId, readAt, user.id));
        }
        if (readerId === user.id) {
          setConversations((prev) => prev.map((c) => (
            c.id === conversationId ? patchConversationUnread(c, user.id, 0) : c
          )));
          requestChatUnreadRefresh();
        }
      }
    }));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [conversationIdsKey, user?.id, bootstrapping]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const publishCurrentPresence = () => {
      publishPresence(document.visibilityState === 'visible' ? 'online' : 'away');
    };
    publishCurrentPresence();
    document.addEventListener('visibilitychange', publishCurrentPresence);
    window.addEventListener('focus', publishCurrentPresence);
    window.addEventListener('blur', publishCurrentPresence);
    return () => {
      document.removeEventListener('visibilitychange', publishCurrentPresence);
      window.removeEventListener('focus', publishCurrentPresence);
      window.removeEventListener('blur', publishCurrentPresence);
      publishPresence('offline');
    };
  }, []);

  const openCompose = () => {
    if (!canSendMessages) return;
    setComposeOpen(true);
    setContactsLoading(true);
    setContactError('');
    getChatContacts()
      .then((list) => setContacts(Array.isArray(list) ? list : []))
      .catch((error) => {
        setContactError(error?.message || 'Unable to load contacts.');
        setContacts([]);
      })
      .finally(() => setContactsLoading(false));
  };

  const closeCompose = useCallback(() => {
    setComposeOpen(false);
    setContactSearch('');
    window.setTimeout(() => composeTriggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!composeOpen) return undefined;
    window.setTimeout(() => contactSearchRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCompose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = composeModalRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [composeOpen, closeCompose]);

  useEffect(() => {
    if (!pendingDeleteIds.length) return undefined;
    window.setTimeout(() => deleteCancelRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingDeleteIds([]);
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = deleteDialogRef.current?.querySelectorAll('button:not([disabled])');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pendingDeleteIds]);

  const isTeacher = user?.role === 'teacher';

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const otherId = getOtherParticipant(c, user?.id);
      const name = c.participantNames[otherId]?.toLowerCase() || '';
      const studentNames = c.participantStudentNames?.[otherId]?.toLowerCase() || '';
      const preview = c.lastMessage?.toLowerCase() || '';
      return name.includes(q) || studentNames.includes(q) || preview.includes(q);
    });
  }, [conversations, search, user?.id]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      c.name?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.studentNames?.toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const activeConv = conversations.find((c) => c.id === active);
  const otherId = activeConv ? getOtherParticipant(activeConv, user?.id) : null;
  const otherParticipantLabel = isTeacher && activeConv
    ? getTeacherParticipantLabel(activeConv, otherId)
    : { title: otherId ? activeConv.participantNames[otherId] : '', subtitle: '' };
  const otherName = otherParticipantLabel.title;
  const otherMeta = otherParticipantLabel.subtitle;
  const isAdminThread = activeConv?.role === 'admin';
  const pageSubtitle = getPageSubtitle(user?.role);
  const presence = participantPresence || activeConv?.participantPresence?.[otherId] || null;

  const messageTimeline = useMemo(
    () => buildMessageTimeline(messages),
    [messages],
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + getConversationUnread(c, user?.id), 0),
    [conversations, user?.id],
  );

  const selectConversation = (id) => {
    setActive(id);
    setMobileChatOpen(true);
  };

  const handleStartConversation = async (contact) => {
    try {
      const conv = await createConversation(contact.id);
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      setActive(conv.id);
      setMobileChatOpen(true);
      setComposeOpen(false);
      setContactSearch('');
    } catch (err) {
      toast(err.message || 'Unable to start conversation.', 'error');
    }
  };

  const setComposeDisabled = useCallback((disabled) => {
    if (inputRef.current) inputRef.current.disabled = disabled;
    if (sendButtonRef.current) sendButtonRef.current.disabled = disabled;
  }, []);

  const handleTypingChange = (value) => {
    inputValueRef.current = value;
    setText(value);
    if (!active) return;
    publishTyping(active, Boolean(value.trim()));
    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => publishTyping(active, false), 1500);
  };

  const syncFeatureSupport = useCallback((error) => {
    if (error?.code === 'CHAT_FEATURE_UNAVAILABLE' || error?.feature) {
      setFeatureSupport(getChatFeatureSupport());
    }
  }, []);

  const handleAttachment = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const conversationId = active;
    if (!files.length || !conversationId || !featureSupport.attachments) return;

    const queued = files.map((file, index) => ({ key: `${Date.now()}-${index}`, name: file.name }));
    setUploadingAttachment(true);
    setPendingUploads(queued);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          const uploaded = await uploadChatAttachment(conversationId, file);
          // The user may have opened another thread while this file was uploading.
          if (activeRef.current !== conversationId) return;
          setAttachments((current) => [...current, uploaded]);
        } catch (error) {
          syncFeatureSupport(error);
          toast(`${file.name}: ${error?.message || 'Unable to upload attachment.'}`, 'error');
          if (error?.code === 'CHAT_FEATURE_UNAVAILABLE') return;
        } finally {
          setPendingUploads((current) => current.filter((item) => item.key !== queued[index].key));
        }
      }
    } finally {
      setUploadingAttachment(false);
      setPendingUploads([]);
    }
  };

  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedIds.includes(message.id)),
    [messages, selectedIds],
  );
  const selectionCount = selectedMessages.length;
  const singleSelected = selectionCount === 1 ? selectedMessages[0] : null;
  const canEditSelection = Boolean(
    singleSelected
    && featureSupport.edit
    && singleSelected.senderId === user?.id
    && !singleSelected.deleted,
  );
  const canReactSelection = Boolean(singleSelected && featureSupport.reactions && !singleSelected.deleted);
  const canDeleteSelection = selectionCount > 0
    && featureSupport.delete
    && selectedMessages.every((message) => message.senderId === user?.id && !message.deleted);

  const toggleMessageSelection = useCallback((messageId) => {
    setSelectedIds((current) => (
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId]
    ));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const handleBubbleClick = useCallback((messageId) => {
    if (window.getSelection?.()?.toString()) return;
    toggleMessageSelection(messageId);
  }, [toggleMessageSelection]);

  useEffect(() => {
    if (!selectionCount) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') clearSelection();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectionCount, clearSelection]);

  const startEditingSelection = () => {
    if (!canEditSelection) return;
    setEditingMessageId(singleSelected.id);
    setEditingText(singleSelected.text || '');
    setSelectedIds([]);
  };

  const handleEditMessage = async (messageId) => {
    try {
      const updated = await editMessage(active, messageId, editingText);
      setMessages((current) => current.map((message) => (
        message.id === messageId ? { ...message, ...updated } : message
      )));
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      syncFeatureSupport(error);
      toast(error?.message || 'Unable to edit message.', 'error');
    }
  };

  const handleDeleteMessages = async (ids) => {
    if (!ids.length) return;
    setDeletingSelection(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteMessage(active, id)));
      const removedIds = ids.filter((_, index) => results[index].status === 'fulfilled');
      if (removedIds.length) {
        setMessages((current) => current.map((message) => (
          removedIds.includes(message.id)
            ? { ...message, deleted: true, text: '', attachments: [], reactions: {} }
            : message
        )));
      }
      const failure = results.find((result) => result.status === 'rejected');
      if (failure) {
        syncFeatureSupport(failure.reason);
        toast(failure.reason?.message || 'Some messages could not be deleted.', 'error');
      }
      setPendingDeleteIds([]);
      setSelectedIds((current) => current.filter((id) => !removedIds.includes(id)));
    } finally {
      setDeletingSelection(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    if (!featureSupport.reactions || !user?.id) return;
    const previous = messages.find((message) => message.id === messageId);
    const optimisticReactions = applyLocalReaction(previous?.reactions, user.id, emoji);
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, reactions: optimisticReactions } : message
    )));
    try {
      const updated = await toggleMessageReaction(active, messageId, user.id, emoji);
      const reactions = mergeReactionsKeepingMine(
        updated?.reactions,
        optimisticReactions,
        user.id,
      );
      setMessages((current) => current.map((message) => (
        message.id === messageId
          ? { ...message, ...updated, reactions }
          : message
      )));
    } catch (error) {
      if (previous) {
        setMessages((current) => current.map((message) => (
          message.id === messageId ? previous : message
        )));
      }
      syncFeatureSupport(error);
      toast(error?.message || 'Unable to update reaction.', 'error');
    }
  };

  const handleSend = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (sendLockRef.current) return;
    // Pressing Enter mid-upload would otherwise send the message without the file.
    if (uploadingAttachment) {
      toast('Wait for the attachment to finish uploading.', 'info');
      return;
    }

    const body = (inputValueRef.current || text).trim();
    if ((!body && attachments.length === 0) || !active || !user?.id || !canSendMessages) return;

    // Attachment-only messages share an empty body, so the guard must also key on the files.
    const attachmentKey = attachments.map((attachment) => attachment.id).join('|');
    const fingerprint = `${active}:${body}:${attachmentKey}`;
    const now = Date.now();
    if (
      lastSendFingerprintRef.current.key === fingerprint
      && now - lastSendFingerprintRef.current.at < 2000
    ) {
      return;
    }

    sendLockRef.current = true;
    lastSendFingerprintRef.current = { key: fingerprint, at: now };
    inputValueRef.current = '';
    setText('');
    const pendingAttachments = attachments;
    setAttachments([]);
    publishTyping(active, false);
    setSending(true);
    setComposeDisabled(true);

    try {
      const msg = await sendMessage(active, user.id, body, pendingAttachments);
      setMessages((prev) => (
        prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, seen: false }]
      ));
      setConversations((prev) => prev.map((c) => (
        c.id === active
          ? { ...c, lastMessage: conversationPreview(msg), lastMessageAt: msg.sentAt }
          : c
      )));
    } catch (err) {
      inputValueRef.current = body;
      setText(body);
      setAttachments(pendingAttachments);
      lastSendFingerprintRef.current = { key: '', at: 0 };
      toast(err.message || 'Unable to send message. Please try again.', 'error');
    } finally {
      sendLockRef.current = false;
      setSending(false);
      setComposeDisabled(false);
    }
  };

  return (
    <AppLayout>
      <div className="messages-shell">
        <div className={`messages-panel ${mobileChatOpen ? 'messages-panel--chat-open' : ''}`}>
          <aside className="messages-sidebar">
            <div className="messages-sidebar__head">
              <div className="messages-sidebar__title-row">
                <div className="messages-sidebar__title-wrap">
                  <h1 className="messages-sidebar__title">Messages</h1>
                  {totalUnread > 0 && (
                    <span className="messages-sidebar__unread-pill" aria-label={`${totalUnread} unread`}>
                      {totalUnread}
                    </span>
                  )}
                </div>
                {canSendMessages && (
                  <button
                    ref={composeTriggerRef}
                    type="button"
                    className="messages-new-btn"
                    onClick={openCompose}
                    aria-label="Start new conversation"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              <p className="messages-sidebar__subtitle">
                <Shield size={12} aria-hidden />
                {pageSubtitle}
              </p>
              <div className="messages-search">
                <Search size={15} className="messages-search__icon" />
                <input
                  type="search"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search conversations"
                />
              </div>
            </div>

            <div className="messages-list">
              {loadingConversations ? (
                <LoadingState message="Loading conversations…" className="messages-sidebar-empty" />
              ) : conversationError ? (
                <div className="messages-error-state" role="alert">
                  <MessageCircle size={24} aria-hidden />
                  <strong>Messages could not load</strong>
                  <p>{conversationError}</p>
                  <button type="button" onClick={loadConversations}>
                    <RefreshCw size={14} /> Try again
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <EmptyState
                  className="messages-sidebar-empty"
                  icon={MessageCircle}
                  title={conversations.length === 0 ? 'No messages yet' : 'No matches'}
                  description={
                    conversations.length === 0
                      ? 'Start a conversation with a teacher or parent using the + button.'
                      : 'Try a different search term.'
                  }
                  action={conversations.length === 0 && canSendMessages ? (
                    <button type="button" className="messages-cta-btn" onClick={openCompose}>
                      Start a conversation
                    </button>
                  ) : null}
                />
              ) : (
                <>
                  {filteredConversations.map((c) => {
                  const oid = getOtherParticipant(c, user.id);
                  const label = isTeacher
                    ? getTeacherParticipantLabel(c, oid)
                    : { title: c.participantNames[oid], subtitle: roleLabel(c.role) };
                  const name = label.title;
                  const unread = getConversationUnread(c, user.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`messages-conv ${active === c.id ? 'is-active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                      onClick={() => selectConversation(c.id)}
                    >
                      <div className={`messages-conv__avatar ${c.role === 'admin' ? 'messages-conv__avatar--admin' : ''}`}>
                        {getInitials(name)}
                      </div>
                      <div className="messages-conv__body">
                        <div className="messages-conv__row">
                          <p className="messages-conv__name">{name}</p>
                          <span className="messages-conv__time">{formatTime(c.lastMessageAt)}</span>
                        </div>
                        <div className="messages-conv__row">
                          <p className="messages-conv__preview">
                            {label.subtitle && (
                              <span className="messages-conv__role">{label.subtitle}</span>
                            )}
                            {c.lastMessage || 'No messages yet'}
                          </p>
                          {unread > 0 && <span className="messages-conv__badge">{unread}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
                </>
              )}
            </div>
          </aside>

          <div className="messages-main">
            {activeConv ? (
              <>
                {selectionCount > 0 ? (
                  <header className="messages-selection-bar">
                    <button
                      type="button"
                      className="messages-selection-bar__close"
                      onClick={clearSelection}
                      aria-label="Cancel selection"
                    >
                      <X size={18} />
                    </button>
                    <p className="messages-selection-bar__count">
                      {selectionCount} selected
                    </p>
                    <div className="messages-selection-bar__actions">
                      {canEditSelection && (
                        <button
                          type="button"
                          className="messages-selection-bar__action"
                          onClick={startEditingSelection}
                          title="Edit message"
                          aria-label="Edit message"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDeleteSelection && (
                        <button
                          type="button"
                          className="messages-selection-bar__action is-danger"
                          onClick={() => setPendingDeleteIds(selectedIds)}
                          title={selectionCount > 1 ? `Delete ${selectionCount} messages` : 'Delete message'}
                          aria-label={selectionCount > 1 ? `Delete ${selectionCount} messages` : 'Delete message'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </header>
                ) : (
                <header className="messages-thread-head">
                  <button
                    type="button"
                    className="messages-thread-back"
                    onClick={() => setMobileChatOpen(false)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className={`messages-thread-head__avatar ${isAdminThread ? 'messages-thread-head__avatar--admin' : ''}`}>
                    {getInitials(otherName)}
                  </div>
                  <div className="messages-thread-head__info">
                    <h2 className="messages-thread-head__name">{otherName}</h2>
                    <p className={`messages-thread-head__meta ${isAdminThread ? 'is-admin' : ''} ${presence?.status === 'online' ? 'is-online' : ''}`}>
                      {isAdminThread ? (
                        <><Shield size={12} aria-hidden />School administration</>
                      ) : typingUserId ? (
                        <span className="messages-typing-label">typing<span aria-hidden>…</span></span>
                      ) : isTeacher && otherMeta ? (
                        otherMeta
                      ) : presence?.status === 'online' ? (
                        <><span className="messages-thread-head__status-dot" aria-hidden />Online</>
                      ) : presence?.lastSeenAt ? (
                        `Last seen ${formatTime(presence.lastSeenAt)}`
                      ) : (
                        roleLabel(activeConv.role)
                      )}
                    </p>
                  </div>
                </header>
                )}

                <div className="messages-thread-body" ref={threadBodyRef}>
                  {loadingMessages ? (
                    <LoadingState message="Loading messages…" className="messages-thread-loading" />
                  ) : messageError ? (
                    <div className="messages-error-state messages-error-state--thread" role="alert">
                      <MessageCircle size={26} aria-hidden />
                      <strong>Conversation could not load</strong>
                      <p>{messageError}</p>
                      <button type="button" onClick={() => loadMessages(active)}>
                        <RefreshCw size={14} /> Try again
                      </button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="messages-thread-empty">
                      <div className="messages-thread-empty__icon" aria-hidden>
                        <MessageCircle size={28} />
                      </div>
                      <h3>Say hello</h3>
                      <p>Send the first message to start this conversation.</p>
                    </div>
                  ) : (
                    <>
                      {hasOlderMessages && (
                        <button
                          type="button"
                          className="messages-load-older"
                          disabled={loadingOlder}
                          onClick={() => loadMessages(active, { older: true })}
                        >
                          {loadingOlder ? <LoaderCircle size={14} className="is-spinning" /> : <RefreshCw size={14} />}
                          {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                        </button>
                      )}
                      <AnimatePresence initial={false}>
                        {messageTimeline.map((item) => (
                        item.type === 'date' ? (
                          <div key={item.key} className="messages-date-divider">
                            <span>{item.label}</span>
                          </div>
                        ) : (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`messages-bubble-wrap ${item.message.senderId === user.id ? 'messages-bubble-wrap--sent' : 'messages-bubble-wrap--received'}${selectedIds.includes(item.message.id) ? ' is-selected' : ''}${selectionCount > 0 ? ' is-selecting' : ''}`}
                        >
                        <div
                          className={`messages-bubble ${item.message.senderId === user.id ? 'messages-bubble--sent' : 'messages-bubble--received'} ${item.message.deleted ? 'is-deleted' : ''} ${selectionCount > 0 ? 'is-selecting' : ''} ${selectedIds.includes(item.message.id) ? 'is-selected' : ''}`}
                          onClick={editingMessageId === item.message.id ? undefined : () => handleBubbleClick(item.message.id)}
                        >
                          {item.message.deleted ? (
                            <p className="messages-bubble__deleted">Message deleted</p>
                          ) : editingMessageId === item.message.id ? (
                            <form className="messages-bubble__edit" onSubmit={(event) => { event.preventDefault(); handleEditMessage(item.message.id); }}>
                              <input value={editingText} onChange={(event) => setEditingText(event.target.value)} aria-label="Edit message" autoFocus />
                              <div><button type="submit" disabled={!editingText.trim()}>Save</button><button type="button" onClick={() => setEditingMessageId(null)}>Cancel</button></div>
                            </form>
                          ) : (
                            <>
                              {item.message.text && <p className="messages-bubble__text">{item.message.text}</p>}
                              {item.message.attachments?.length > 0 && (
                                <div className="messages-bubble__attachments">
                                  {item.message.attachments.map((attachment, attachmentIndex) => (
                                    <ChatAttachmentView
                                      key={attachment.id || attachment.url || attachmentIndex}
                                      attachment={attachment}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          <span className="messages-bubble__meta">
                            {item.message.editedAt && !item.message.deleted && <span className="messages-bubble__edited">edited</span>}
                            <span className="messages-bubble__time">
                              {new Date(item.message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {item.message.senderId === user.id && (
                              <span
                                className={`messages-bubble__status ${item.message.seen ? 'messages-bubble__status--seen' : ''}`}
                                title={item.message.seen ? 'Seen' : 'Delivered'}
                                aria-label={item.message.seen ? 'Seen' : 'Delivered'}
                              >
                                {item.message.seen ? <CheckCheck size={12} /> : <Check size={12} />}
                              </span>
                            )}
                          </span>
                        </div>
                          {canReactSelection && singleSelected.id === item.message.id ? (
                            <div
                              className="messages-reaction-menu messages-reaction-menu--docked"
                              aria-label="Choose a reaction"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {QUICK_REACTIONS.map((emoji) => {
                                const mine = getUserReactionEmoji(
                                  reactionsForDisplay(item.message.reactions, user.id),
                                  user.id,
                                ) === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`messages-reaction-menu__btn${mine ? ' is-active' : ''}`}
                                    title={mine ? `Remove ${emoji}` : `React ${emoji}`}
                                    aria-label={mine ? `Remove reaction ${emoji}` : `React with ${emoji}`}
                                    aria-pressed={mine}
                                    onClick={() => {
                                      handleReaction(item.message.id, emoji);
                                      clearSelection();
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            !item.message.deleted
                            && featureSupport.reactions
                            && Object.keys(reactionsForDisplay(item.message.reactions, user.id)).length > 0 && (
                            <div className="messages-bubble__reactions" aria-label="Message reactions">
                              {Object.entries(reactionsForDisplay(item.message.reactions, user.id)).map(([emoji, userIds]) => {
                                const ids = reactionUserIds(userIds);
                                const mine = ids.includes(String(user.id));
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`messages-bubble__reaction-btn${mine ? ' is-mine' : ''}`}
                                    title={mine ? `Remove ${emoji}` : `React ${emoji}`}
                                    aria-label={`${emoji}${ids.length > 1 ? ` ${ids.length}` : ''}${mine ? ', your reaction' : ''}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleReaction(item.message.id, emoji);
                                    }}
                                  >
                                    <span className="messages-bubble__reaction-emoji" aria-hidden>{emoji}</span>
                                    {ids.length > 1 && (
                                      <span className="messages-bubble__reaction-count">{ids.length}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            )
                          )}
                        </motion.div>
                        )
                        ))}
                      </AnimatePresence>
                    </>
                  )}
                  <div ref={bottomRef} />
                </div>

                {canSendMessages ? (
                  <form className="messages-compose" onSubmit={handleSend} noValidate>
                    {featureSupport.attachments && (
                      <>
                        <input ref={fileInputRef} type="file" multiple className="sr-only" accept={CHAT_ATTACHMENT_ACCEPT} onChange={handleAttachment} />
                        <button type="button" className="messages-compose__attach" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingAttachment} aria-label="Attach a file">
                          {uploadingAttachment ? <LoaderCircle size={18} className="is-spinning" /> : <Paperclip size={18} />}
                        </button>
                      </>
                    )}
                    <div className="messages-compose__field">
                      {(attachments.length > 0 || pendingUploads.length > 0) && (
                        <div className="messages-compose__attachments" aria-label="Attachments ready to send">
                          {attachments.map((attachment, index) => (
                            <span key={attachment.id || index}><FileText size={13} />{attachment.name}<button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${attachment.name}`}><X size={12} /></button></span>
                          ))}
                          {pendingUploads.map((pending) => (
                            <span key={pending.key} className="is-uploading"><LoaderCircle size={13} className="is-spinning" />{pending.name}<small>Uploading…</small></span>
                          ))}
                        </div>
                      )}
                      <div className="messages-compose__input-wrap">
                        <input
                          ref={inputRef}
                          value={text}
                          onChange={(event) => handleTypingChange(event.target.value)}
                          placeholder="Write a message…"
                          disabled={sending}
                          aria-label="Message"
                        />
                      </div>
                    </div>
                    <button
                      ref={sendButtonRef}
                      type="submit"
                      className="messages-compose__send"
                      disabled={sending || uploadingAttachment || (!text.trim() && attachments.length === 0)}
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                ) : (
                  <div className="messages-compose-readonly" role="status">
                    You can read this conversation, but your role cannot send messages.
                  </div>
                )}
              </>
            ) : (
              <div className="messages-main__empty">
                <EmptyState
                  icon={MessageCircle}
                  title="Select a conversation"
                  description="Choose a chat from the sidebar or start a new one with the + button."
                  action={canSendMessages ? (
                    <button type="button" className="messages-cta-btn" onClick={openCompose}>
                      Start a conversation
                    </button>
                  ) : null}
                />
              </div>
            )}
          </div>
        </div>

        {composeOpen && (
          <div className="messages-compose-modal">
            <div className="messages-compose-modal__backdrop" onClick={closeCompose} />
            <div ref={composeModalRef} className="messages-compose-modal__panel" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title" aria-describedby="new-conversation-description">
              <header className="messages-compose-modal__head">
                <div>
                  <h2 id="new-conversation-title">New conversation</h2>
                  <p id="new-conversation-description">Choose someone to message</p>
                </div>
                <button type="button" className="messages-compose-modal__close" onClick={closeCompose} aria-label="Close new conversation">
                  <X size={18} />
                </button>
              </header>
              <div className="messages-search">
                <Search size={16} className="messages-search__icon" />
                <input
                  ref={contactSearchRef}
                  type="search"
                  placeholder="Search contacts…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  aria-label="Search contacts"
                />
              </div>
              <div className="messages-compose-modal__list">
                {contactsLoading ? (
                  <LoadingState message="Loading contacts…" className="messages-compose-modal__empty" />
                ) : contactError ? (
                  <div className="messages-error-state" role="alert">
                    <MessageCircle size={22} aria-hidden />
                    <strong>Contacts could not load</strong>
                    <p>{contactError}</p>
                    <button type="button" onClick={openCompose}><RefreshCw size={14} /> Try again</button>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <p className="messages-compose-modal__empty">No contacts available to message.</p>
                ) : (
                  filteredContacts.map((contact) => {
                    const label = isTeacher
                      ? getTeacherContactLabel(contact)
                      : { title: contact.name, subtitle: roleLabel(contact.role) };
                    return (
                    <button
                      key={contact.id}
                      type="button"
                      className="messages-compose-contact"
                      onClick={() => handleStartConversation(contact)}
                    >
                      <div className={`messages-conv__avatar ${contact.role === 'admin' ? 'messages-conv__avatar--admin' : ''}`}>
                        {getInitials(label.title)}
                      </div>
                      <div className="messages-compose-contact__body">
                        <p className="messages-conv__name">{label.title}</p>
                        <p className="messages-compose-contact__meta">{label.subtitle}</p>
                      </div>
                    </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        {pendingDeleteIds.length > 0 && (
          <div className="messages-compose-modal">
            <div className="messages-compose-modal__backdrop" onClick={() => setPendingDeleteIds([])} />
            <div ref={deleteDialogRef} className="messages-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-message-title" aria-describedby="delete-message-description">
              <span className="messages-delete-dialog__icon" aria-hidden><Trash2 size={15} /></span>
              <div className="messages-delete-dialog__copy">
                <h2 id="delete-message-title">
                  {pendingDeleteIds.length > 1 ? `Delete ${pendingDeleteIds.length} messages?` : 'Delete this message?'}
                </h2>
                <p id="delete-message-description">Text, files, and reactions are removed for everyone.</p>
              </div>
              <div className="messages-delete-dialog__actions">
                <button ref={deleteCancelRef} type="button" disabled={deletingSelection} onClick={() => setPendingDeleteIds([])}>Cancel</button>
                <button type="button" className="is-danger" disabled={deletingSelection} onClick={() => handleDeleteMessages(pendingDeleteIds)}>
                  {deletingSelection ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
