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
} from '../../services/chatService.js';
import {
  publishChatUnreadSnapshot,
  clearChatUnreadSnapshot,
  requestChatUnreadRefresh,
} from '../../hooks/useUnreadMessageCount.js';
import { subscribeToConversation } from '../../services/chatRealtime.js';
import {
  getConversationUnread,
  patchConversationUnread,
} from '../../utils/chatUnread.js';
import {
  Send, MessageCircle, Search, ArrowLeft, Shield, Plus, X, Check, CheckCheck,
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

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getOtherParticipant(conv, userId) {
  return conv.participants.find((p) => p !== userId);
}

function roleLabel(role) {
  if (role === 'admin') return 'School administration';
  if (role === 'parent') return 'Parent';
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

export default function ChatPage() {
  const { user, bootstrapping } = useAuth();
  const { toast } = useToast();
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
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sendButtonRef = useRef(null);
  const sendLockRef = useRef(false);
  const inputValueRef = useRef('');
  const lastSendFingerprintRef = useRef({ key: '', at: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConvId = searchParams.get('c');

  const activeRef = useRef(null);
  activeRef.current = active;

  const loadConversations = useCallback(() => {
    if (bootstrapping || !user?.id || !getAccessToken()) return Promise.resolve();
    setLoadingConversations(true);
    return getConversationsForUser(user.id)
      .then((list) => {
        const items = Array.isArray(list) ? list : [];
        setConversations(items);
        if (items.length && !active) {
          setActive(items[0].id);
        }
      })
      .catch(() => {
        toast('Unable to load conversations. Please try again.', 'error');
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
    loadConversations();
  }, [loadConversations]);

  // Deep-link: open a specific conversation when arriving from a notification.
  useEffect(() => {
    if (!requestedConvId || conversations.length === 0) return;
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
  }, [requestedConvId, conversations, setSearchParams]);

  useEffect(() => {
    if (!active || !user?.id) return undefined;

    let cancelled = false;
    setLoadingMessages(true);
    getMessages(active)
      .then((list) => {
        if (!cancelled) setMessages(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) {
          toast('Unable to load messages. Please try again.', 'error');
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    markConversationRead(active, user.id)
      .then(() => {
        setConversations((prev) => prev.map((c) => (
          c.id === active ? patchConversationUnread(c, user.id, 0) : c
        )));
        requestChatUnreadRefresh();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [active, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const conversationIdsKey = useMemo(
    () => conversations.map((c) => c.id).sort().join(','),
    [conversations.map((c) => c.id).sort().join(',')],
  );

  useEffect(() => {
    if (bootstrapping || !user?.id || !getAccessToken() || !conversationIdsKey) return undefined;

    const conversationIds = conversationIdsKey.split(',');
    const unsubs = conversationIds.map((conversationId) => subscribeToConversation(conversationId, (payload) => {
      if (payload?.event === 'message:new' && payload.message) {
        const msg = payload.message;
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
              lastMessage: msg.text,
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

  const openCompose = () => {
    setComposeOpen(true);
    setContactsLoading(true);
    getChatContacts()
      .then((list) => setContacts(Array.isArray(list) ? list : []))
      .catch(() => {
        toast('Unable to load contacts. Please try again.', 'error');
        setContacts([]);
      })
      .finally(() => setContactsLoading(false));
  };

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

  const handleSend = useCallback(async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (sendLockRef.current) return;

    const body = (inputValueRef.current || text).trim();
    if (!body || !active || !user?.id) return;

    const fingerprint = `${active}:${body}`;
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
    setSending(true);
    setComposeDisabled(true);

    try {
      const msg = await sendMessage(active, user.id, body);
      setMessages((prev) => (
        prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, seen: false }]
      ));
      setConversations((prev) => prev.map((c) => (
        c.id === active
          ? { ...c, lastMessage: msg.text, lastMessageAt: msg.sentAt }
          : c
      )));
    } catch (err) {
      inputValueRef.current = body;
      setText(body);
      lastSendFingerprintRef.current = { key: '', at: 0 };
      toast(err.message || 'Unable to send message. Please try again.', 'error');
    } finally {
      sendLockRef.current = false;
      setSending(false);
      setComposeDisabled(false);
    }
  }, [active, text, user?.id, toast, setComposeDisabled]);

  return (
    <AppLayout>
      <div className="messages-shell">
        <div className={`messages-panel ${mobileChatOpen ? 'messages-panel--chat-open' : ''}`}>
          <aside className="messages-sidebar">
            <div className="messages-sidebar__head">
              <div className="messages-sidebar__title-row">
                <h1 className="messages-sidebar__title">Messages</h1>
                <button
                  type="button"
                  className="messages-new-btn sb-button-primary"
                  onClick={openCompose}
                  aria-label="Start new conversation"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="messages-sidebar__subtitle">Secure chat with teachers and school staff</p>
              <div className="messages-search">
                <Search size={16} className="messages-search__icon" />
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
              ) : filteredConversations.length === 0 ? (
                <EmptyState
                  className="messages-sidebar-empty !py-8"
                  icon={MessageCircle}
                  title={conversations.length === 0 ? 'No messages yet' : 'No matches'}
                  description={
                    conversations.length === 0
                      ? 'Start a conversation with a teacher or parent using the + button.'
                      : 'Try a different search term.'
                  }
                  action={conversations.length === 0 ? (
                    <button type="button" className="sb-button-primary messages-new-link" onClick={openCompose}>
                      Start a conversation
                    </button>
                  ) : null}
                />
              ) : (
                filteredConversations.map((c) => {
                  const oid = getOtherParticipant(c, user.id);
                  const label = isTeacher
                    ? getTeacherParticipantLabel(c, oid)
                    : { title: c.participantNames[oid], subtitle: '' };
                  const name = label.title;
                  const unread = getConversationUnread(c, user.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`messages-conv ${active === c.id ? 'is-active' : ''}`}
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
                          <p className="messages-conv__preview">{c.lastMessage || 'No messages yet'}</p>
                          {unread > 0 && <span className="messages-conv__badge">{unread}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="messages-main">
            {activeConv ? (
              <>
                <header className="messages-thread-head">
                  <button
                    type="button"
                    className="messages-thread-back"
                    onClick={() => setMobileChatOpen(false)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="messages-thread-head__avatar">
                    {getInitials(otherName)}
                  </div>
                  <div className="messages-thread-head__info">
                    <h2 className="messages-thread-head__name">{otherName}</h2>
                    <p className="messages-thread-head__meta">
                      {isAdminThread ? (
                        <><Shield size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />School administration</>
                      ) : isTeacher && otherMeta ? (
                        otherMeta
                      ) : (
                        `Available · ${roleLabel(activeConv.role)}`
                      )}
                    </p>
                  </div>
                </header>

                <div className="messages-thread-body">
                  {loadingMessages ? (
                    <LoadingState message="Loading messages…" className="messages-thread-loading" />
                  ) : (
                    <AnimatePresence>
                      {messages.map((m) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`messages-bubble ${m.senderId === user.id ? 'messages-bubble--sent' : 'messages-bubble--received'}`}
                        >
                          {m.text}
                          <span className="messages-bubble__meta">
                            <span className="messages-bubble__time">
                              {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {m.senderId === user.id && (
                              <span
                                className={`messages-bubble__status ${m.seen ? 'messages-bubble__status--seen' : ''}`}
                                title={m.seen ? 'Seen' : 'Delivered'}
                                aria-label={m.seen ? 'Seen' : 'Delivered'}
                              >
                                {m.seen ? <CheckCheck size={12} /> : <Check size={12} />}
                              </span>
                            )}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                  <div ref={bottomRef} />
                </div>

                <form className="messages-compose" onSubmit={handleSend} noValidate>
                  <div className="messages-compose__input-wrap">
                    <input
                      ref={inputRef}
                      value={text}
                      onChange={(e) => {
                        inputValueRef.current = e.target.value;
                        setText(e.target.value);
                      }}
                      placeholder="Write a message…"
                      disabled={sending}
                      aria-label="Message"
                    />
                  </div>
                  <button
                    ref={sendButtonRef}
                    type="submit"
                    className="messages-compose__send sb-button-primary"
                    disabled={sending || !text.trim()}
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </>
            ) : (
              <div className="messages-main__empty">
                <EmptyState
                  icon={MessageCircle}
                  title="Select a conversation"
                  description="Choose a chat from the sidebar or start a new one with the + button."
                  action={(
                    <button type="button" className="sb-button-primary messages-new-link" onClick={openCompose}>
                      Start a conversation
                    </button>
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {composeOpen && (
          <div className="messages-compose-modal" role="dialog" aria-modal="true" aria-label="New conversation">
            <div className="messages-compose-modal__backdrop" onClick={() => setComposeOpen(false)} />
            <div className="messages-compose-modal__panel">
              <header className="messages-compose-modal__head">
                <h2>New conversation</h2>
                <button type="button" onClick={() => setComposeOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </header>
              <div className="messages-search">
                <Search size={16} className="messages-search__icon" />
                <input
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
      </div>
    </AppLayout>
  );
}
