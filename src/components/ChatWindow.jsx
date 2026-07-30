import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Send, MessageCircle } from 'lucide-react';

/**
 * ChatWindow — real-time 1:1 chat panel.
 *
 * Props:
 *   connectionId  — UUID of the accepted connection
 *   currentUserId — auth.uid() of the logged-in user
 *   otherUserName — display name of the other party
 *   onClose       — callback to close the panel
 *   onUnreadChange — callback(count) when unread count changes
 */
export default function ChatWindow({ connectionId, currentUserId, otherUserName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load messages + subscribe to realtime
  useEffect(() => {
    if (!connectionId) return;

    let channel;

    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      setLoading(false);

      // Mark unread messages as read
      markAsRead(data || []);
    };

    const subscribe = () => {
      channel = supabase
        .channel(`chat-${connectionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `connection_id=eq.${connectionId}`,
          },
          (payload) => {
            const newMsg = payload.new;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark as read if it's from the other user
            if (newMsg.sender_id !== currentUserId) {
              supabase
                .from('messages')
                .update({ read: true })
                .eq('id', newMsg.id)
                .then(() => {});
            }
          }
        )
        .subscribe();
    };

    loadMessages();
    subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [connectionId, currentUserId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const markAsRead = async (msgs) => {
    const unreadIds = msgs
      .filter((m) => m.sender_id !== currentUserId && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadIds);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');

    // Optimistic add
    const optimistic = {
      id: `temp-${Date.now()}`,
      connection_id: connectionId,
      sender_id: currentUserId,
      content: text,
      read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId,
      sender_id: currentUserId,
      content: text,
    });

    if (error) {
      console.error('Failed to send message:', error.message);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text); // Restore input
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateSeparator = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Group messages by date
  const getDateKey = (ts) => new Date(ts).toDateString();

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-panel__header">
          <div className="chat-panel__header-info">
            <div className="chat-panel__avatar">
              <MessageCircle size={18} />
            </div>
            <div>
              <div className="chat-panel__name">{otherUserName}</div>
              <div className="chat-panel__status">
                {loading ? 'Loading...' : `${messages.length} messages`}
              </div>
            </div>
          </div>
          <button className="chat-panel__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-panel__messages">
          {loading ? (
            <div className="chat-panel__loading">
              <div className="spinner spinner--sm" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-panel__empty">
              <MessageCircle size={40} strokeWidth={1.2} />
              <p>No messages yet</p>
              <span>Send the first message to start the conversation!</span>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId;
              const showDate =
                i === 0 || getDateKey(msg.created_at) !== getDateKey(messages[i - 1].created_at);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="chat-date-separator">
                      <span>{formatDateSeparator(msg.created_at)}</span>
                    </div>
                  )}
                  <div className={`chat-bubble-row ${isMine ? 'chat-bubble-row--mine' : ''}`}>
                    <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                      <div className="chat-bubble__text">{msg.content}</div>
                      <div className="chat-bubble__meta">
                        <span className="chat-bubble__time">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          <span className={`chat-bubble__read ${msg.read ? 'chat-bubble__read--seen' : ''}`}>
                            {msg.read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form className="chat-panel__input-bar" onSubmit={sendMessage}>
          <input
            ref={inputRef}
            className="chat-panel__input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-panel__send"
            disabled={!input.trim() || sending}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
