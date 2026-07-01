import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getConversationsForUser, getMessages, sendMessage, markConversationRead } from '../../services/chatService.js';
import { Send } from 'lucide-react';

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
    <DashboardLayout>
      <PageHeader title="Messages" subtitle="Secure chat with teachers and school admin." />

      <div className="chat-layout">
        <div className="chat-list">
          {conversations.map((c) => {
            const otherId = c.participants.find((p) => p !== user.id);
            return (
              <div key={c.id} className={`chat-list-item ${active === c.id ? 'active' : ''}`} onClick={() => setActive(c.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4>{c.participantNames[otherId]}</h4>
                  <p>{c.lastMessage}</p>
                </div>
                {c.unread?.[user.id] > 0 && <span className="chat-unread">{c.unread[user.id]}</span>}
              </div>
            );
          })}
        </div>

        <div className="chat-window">
          {activeConv ? (
            <>
              <div className="chat-header">
                {activeConv.participantNames[activeConv.participants.find((p) => p !== user.id)]}
              </div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.senderId === user.id ? 'sent' : 'received'}`}>
                    {m.text}
                    <div className="chat-bubble-time">{new Date(m.sentAt).toLocaleTimeString()}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="chat-input-bar">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                <Button variant="primary" onClick={handleSend} loading={sending}><Send size={16} /></Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', flex: 1, color: 'var(--muted)' }}>Select a conversation</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
