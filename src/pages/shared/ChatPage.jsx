import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getConversationsForUser,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../../services/chatService.js';
import {
  Send, MessageCircle, Search, ArrowLeft, Shield,
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

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getConversationsForUser(user.id).then((list) => {
      setConversations(list);
      if (list.length && !active) setActive(list[0].id);
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || !user) return;
    getMessages(active).then(setMessages);
    markConversationRead(active, user.id);
  }, [active, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const otherId = getOtherParticipant(c, user?.id);
      const name = c.participantNames[otherId]?.toLowerCase() || '';
      const preview = c.lastMessage?.toLowerCase() || '';
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, search, user?.id]);

  const activeConv = conversations.find((c) => c.id === active);
  const otherId = activeConv ? getOtherParticipant(activeConv, user?.id) : null;
  const otherName = otherId ? activeConv.participantNames[otherId] : '';
  const isAdminThread = activeConv?.role === 'admin';

  const selectConversation = (id) => {
    setActive(id);
    setMobileChatOpen(true);
  };

  const handleSend = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      const msg = await sendMessage(active, user.id, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
      setConversations((prev) => prev.map((c) => (
        c.id === active
          ? { ...c, lastMessage: msg.text, lastMessageAt: msg.sentAt }
          : c
      )));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="messages-shell">
        <div className={`messages-panel ${mobileChatOpen ? 'messages-panel--chat-open' : ''}`}>
          {/* Sidebar */}
          <aside className="messages-sidebar">
            <div className="messages-sidebar__head">
              <h1 className="messages-sidebar__title">Messages</h1>
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
              {filteredConversations.length === 0 ? (
                <div className="messages-sidebar-empty">
                  <div className="messages-sidebar-empty__icon">
                    <MessageCircle size={28} strokeWidth={1.75} />
                  </div>
                  <h3>{conversations.length === 0 ? 'No messages yet' : 'No matches'}</h3>
                  <p>
                    {conversations.length === 0
                      ? 'When parents or staff message you, conversations will appear here.'
                      : 'Try a different search term.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const oid = getOtherParticipant(c, user.id);
                  const name = c.participantNames[oid];
                  const unread = c.unread?.[user.id] || 0;
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
                          <p className="messages-conv__preview">{c.lastMessage}</p>
                          {unread > 0 && <span className="messages-conv__badge">{unread}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Main chat */}
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
                      ) : (
                        'Available · Teacher'
                      )}
                    </p>
                  </div>
                </header>

                <div className="messages-thread-body">
                  <AnimatePresence>
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`messages-bubble ${m.senderId === user.id ? 'messages-bubble--sent' : 'messages-bubble--received'}`}
                      >
                        {m.text}
                        <span className="messages-bubble__time">
                          {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>

                <div className="messages-compose">
                  <div className="messages-compose__input-wrap">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Write a message…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      aria-label="Message"
                    />
                  </div>
                  <button
                    type="button"
                    className="messages-compose__send"
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="messages-main__empty">
                <div className="messages-main__empty-icon">
                  <MessageCircle size={32} strokeWidth={1.75} />
                </div>
                <h2>Select a conversation</h2>
                <p>
                  Choose a chat from the sidebar to view messages and reply securely.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
