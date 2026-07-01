import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getConversationsForUser, getMessages, sendMessage, markConversationRead } from '../../services/chatService.js';
import { Send, MessageCircle } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user) getConversationsForUser(user.id).then((c) => { setConversations(c); if (c.length) setActive(c[0].id); });
  }, [user]);

  useEffect(() => {
    if (active) {
      getMessages(active).then(setMessages);
      markConversationRead(active, user.id);
    }
  }, [active, user.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(active, user.id, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === active);

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Messages</h1>
          <p className="premium-page-subtitle">Secure chat with teachers and school administration.</p>
        </div>

        <div className="premium-chat">
          <div className="premium-chat-list">
            {conversations.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <MessageCircle size={40} className="empty-state-icon" />
                <h3>No Messages Yet</h3>
                <p>Start a conversation with the parent or teacher.</p>
              </div>
            ) : conversations.map((c) => {
              const otherId = c.participants.find((p) => p !== user.id);
              const initials = c.participantNames[otherId]?.split(' ').map((n) => n[0]).join('').slice(0, 2);
              return (
                <div
                  key={c.id}
                  className={`premium-chat-item ${active === c.id ? 'active' : ''}`}
                  onClick={() => setActive(c.id)}
                >
                  <div className="premium-chat-avatar">{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{c.participantNames[otherId]}</h4>
                      {c.unread?.[user.id] > 0 && <span className="chat-unread">{c.unread[user.id]}</span>}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-window" style={{ display: 'flex', flexDirection: 'column' }}>
            {activeConv ? (
              <>
                <div className="chat-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 15 }}>
                  {activeConv.participantNames[activeConv.participants.find((p) => p !== user.id)]}
                </div>
                <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence>
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`premium-bubble ${m.senderId === user.id ? 'sent' : 'received'}`}
                      >
                        {m.text}
                        <div className="chat-bubble-time">{new Date(m.sentAt).toLocaleTimeString()}</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>
                <div className="chat-input-bar">
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                  <button type="button" className="premium-btn premium-btn-primary premium-btn-icon" onClick={handleSend} disabled={sending}>
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', flex: 1, color: 'var(--muted)' }}>Select a conversation</div>
            )}
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
