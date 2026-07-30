import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import {
  MessageCircle, Search, Send, User, Check, CheckCheck,
  Stethoscope, ArrowLeft, ShieldAlert
} from 'lucide-react';

export default function Messages() {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConn, setActiveConn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Load all connected contacts (doctors for patients, patients for doctors)
  const fetchConnections = useCallback(async () => {
    if (!user || !role) return;

    const column = role === 'doctor' ? 'doctor_id' : 'patient_id';
    const relation = role === 'doctor' ? 'patients(*)' : 'doctors(*)';

    const { data, error } = await supabase
      .from('connections')
      .select(`*, ${relation}`)
      .eq(column, user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat connections:', error.message);
      setLoading(false);
      return;
    }

    // Enhance each connection with last message and unread count
    const enriched = await Promise.all(
      (data || []).map(async (conn) => {
        // Fetch last message
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('*')
          .eq('connection_id', conn.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Fetch unread count for current user
        const { count: unread } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id)
          .eq('read', false)
          .neq('sender_id', user.id);

        return {
          ...conn,
          lastMessage: lastMsgs?.[0] || null,
          unreadCount: unread || 0,
          otherParty: role === 'doctor' ? conn.patients : conn.doctors,
        };
      })
    );

    setConnections(enriched);

    // Auto-select connection from URL param if available
    const paramId = searchParams.get('connectionId');
    if (paramId) {
      const match = enriched.find((c) => c.id === paramId);
      if (match) setActiveConn(match);
    } else if (enriched.length > 0 && !activeConn) {
      if (window.innerWidth > 768) {
        setActiveConn(enriched[0]);
      }
    }

    setLoading(false);
  }, [user, role, searchParams, activeConn]);

  useEffect(() => {
    fetchConnections();
  }, [user, role]);

  // 2. Load messages for active connection
  const loadMessages = useCallback(async (connId) => {
    if (!connId) return;
    setMsgLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('connection_id', connId)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
      markAsRead(connId, data || []);
    }
    setMsgLoading(false);
  }, [user]);

  useEffect(() => {
    if (activeConn?.id) {
      loadMessages(activeConn.id);
    } else {
      setMessages([]);
    }
  }, [activeConn?.id, loadMessages]);

  // 3. Realtime subscription for incoming messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new;

          // If message belongs to active open chat
          if (activeConn?.id === newMsg.connection_id) {
            setMessages((prev) => {
              const exists = prev.some(
                (m) => m.id === newMsg.id || (m._tempId && m.content === newMsg.content && m.sender_id === newMsg.sender_id)
              );
              if (exists) {
                return prev.map((m) =>
                  (m._tempId && m.content === newMsg.content && m.sender_id === newMsg.sender_id) ? newMsg : m
                );
              }
              return [...prev, newMsg];
            });

            if (newMsg.sender_id !== user.id) {
              supabase.from('messages').update({ read: true }).eq('id', newMsg.id).then(() => {});
            }
          }

          // Update sidebar chat list preview + unread badges
          setConnections((prevConns) =>
            prevConns.map((conn) => {
              if (conn.id === newMsg.connection_id) {
                const isCurrentActive = activeConn?.id === conn.id;
                return {
                  ...conn,
                  lastMessage: newMsg,
                  unreadCount: isCurrentActive || newMsg.sender_id === user.id ? 0 : (conn.unreadCount || 0) + 1,
                };
              }
              return conn;
            })
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, activeConn?.id]);

  // Mark unread messages as read
  const markAsRead = async (connId, msgs) => {
    if (!user) return;
    const unreadIds = msgs
      .filter((m) => m.sender_id !== user.id && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read: true }).in('id', unreadIds);

      setConnections((prev) =>
        prev.map((c) => (c.id === connId ? { ...c, unreadCount: 0 } : c))
      );
    }
  };

  // Auto-scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle contact selection
  const selectContact = (conn) => {
    setActiveConn(conn);
    setSearchParams({ connectionId: conn.id });
    setConnections((prev) =>
      prev.map((c) => (c.id === conn.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Send message — optimistic insert + Realtime dedup
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !activeConn || sending) return;

    setSending(true);
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      _tempId: tempId,
      connection_id: activeConn.id,
      sender_id: user.id,
      content: text,
      read: false,
      created_at: new Date().toISOString(),
    };

    // Optimistically add to UI
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase
      .from('messages')
      .insert({
        connection_id: activeConn.id,
        sender_id: user.id,
        content: text,
      });

    if (error) {
      console.error('Failed to send message:', error.message);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
      setInput(text);
    }
    // On success: do NOT manually update state here.
    // The Realtime INSERT listener will replace the optimistic message.

    setSending(false);
    inputRef.current?.focus();
  };

  // Format helpers
  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateLabel = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const filteredConnections = connections.filter((c) => {
    const name = c.otherParty?.full_name?.toLowerCase() || '';
    const spec = c.otherParty?.speciality?.toLowerCase() || '';
    const q = contactSearch.toLowerCase();
    return name.includes(q) || spec.includes(q);
  });

  const totalUnreadAll = connections.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content messages-page-container">
        <div className="messages-layout">
          {/* ── LEFT PANEL: Contact / Chat List ── */}
          <div className={`chat-sidebar ${activeConn ? 'chat-sidebar--has-active' : ''}`}>
            <div className="chat-sidebar__header">
              <div className="chat-sidebar__title-row">
                <h2>Messages</h2>
                {totalUnreadAll > 0 && <span className="unread-badge">{totalUnreadAll}</span>}
              </div>
              <div className="search-bar chat-sidebar__search">
                <Search size={16} className="search-bar__icon" />
                <input
                  className="form-input search-bar__input"
                  placeholder={role === 'doctor' ? 'Search patients...' : 'Search doctors...'}
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="chat-sidebar__list">
              {loading ? (
                <div className="chat-sidebar__loading">
                  <div className="spinner spinner--sm" />
                  <span>Loading chats...</span>
                </div>
              ) : filteredConnections.length === 0 ? (
                <div className="chat-sidebar__empty">
                  <MessageCircle size={32} />
                  <p>{contactSearch ? 'No matching contacts' : 'No connected contacts yet'}</p>
                  <span>
                    {role === 'patient'
                      ? 'Connect with a doctor from your dashboard to start chatting.'
                      : 'Accept patient connection requests to start chatting.'}
                  </span>
                </div>
              ) : (
                filteredConnections.map((conn) => {
                  const isSelected = activeConn?.id === conn.id;
                  const name = conn.otherParty?.full_name || 'User';
                  const subtext = role === 'doctor'
                    ? (conn.otherParty?.location || 'Patient')
                    : (conn.otherParty?.speciality || 'Doctor');
                  const lastMsgText = conn.lastMessage?.content || 'No messages yet';
                  const lastMsgTime = conn.lastMessage ? formatTime(conn.lastMessage.created_at) : '';

                  return (
                    <div
                      key={conn.id}
                      className={`chat-item ${isSelected ? 'chat-item--active' : ''}`}
                      onClick={() => selectContact(conn)}
                    >
                      <div className="chat-item__avatar">
                        {role === 'patient' ? <Stethoscope size={20} /> : <User size={20} />}
                      </div>
                      <div className="chat-item__info">
                        <div className="chat-item__top">
                          <span className="chat-item__name">{name}</span>
                          <span className="chat-item__time">{lastMsgTime}</span>
                        </div>
                        <div className="chat-item__bottom">
                          <span className="chat-item__snippet">{lastMsgText}</span>
                          {conn.unreadCount > 0 && (
                            <span className="unread-badge chat-item__badge">{conn.unreadCount}</span>
                          )}
                        </div>
                        <span className="chat-item__subtext">{subtext}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Active Chat Conversation ── */}
          <div className={`chat-main ${activeConn ? 'chat-main--active' : ''}`}>
            {activeConn ? (
              <div className="chat-view">
                {/* Active Chat Header */}
                <div className="chat-view__header">
                  <button className="chat-view__back-btn" onClick={() => setActiveConn(null)}>
                    <ArrowLeft size={20} />
                  </button>
                  <div className="chat-view__avatar">
                    {role === 'patient' ? <Stethoscope size={20} /> : <User size={20} />}
                  </div>
                  <div className="chat-view__header-info">
                    <h3>{activeConn.otherParty?.full_name || 'Contact'}</h3>
                    <span>
                      {role === 'doctor'
                        ? `Patient ${activeConn.otherParty?.age ? `(${activeConn.otherParty.age} yrs)` : ''} • ${activeConn.otherParty?.location || ''}`
                        : `${activeConn.otherParty?.speciality || 'Medical Professional'} • ${activeConn.otherParty?.clinic_name || ''}`}
                    </span>
                  </div>
                </div>

                {/* Messages Thread */}
                <div className="chat-view__messages">
                  {msgLoading ? (
                    <div className="chat-view__loading">
                      <div className="spinner spinner--sm" />
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="chat-view__empty">
                      <MessageCircle size={48} strokeWidth={1.2} />
                      <p>Start conversation with {activeConn.otherParty?.full_name?.split(' ')[0]}</p>
                      <span>Send a message below. Messages are secure and private.</span>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMine = msg.sender_id === user.id;
                      const showDate =
                        i === 0 ||
                        new Date(msg.created_at).toDateString() !==
                        new Date(messages[i - 1].created_at).toDateString();

                      return (
                        <div key={msg.id || i}>
                          {showDate && (
                            <div className="chat-date-separator">
                              <span>{formatDateLabel(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`chat-bubble-row ${isMine ? 'chat-bubble-row--mine' : ''}`}>
                            <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                              <div className="chat-bubble__text">{msg.content}</div>
                              <div className="chat-bubble__meta">
                                <span className="chat-bubble__time">{formatTime(msg.created_at)}</span>
                                {isMine && (
                                  <span className={`chat-bubble__read ${msg.read ? 'chat-bubble__read--seen' : ''}`}>
                                    {msg.read ? <CheckCheck size={14} /> : <Check size={14} />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Bar */}
                <form className="chat-view__input-bar" onSubmit={handleSendMessage}>
                  <input
                    ref={inputRef}
                    className="chat-view__input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn btn--primary chat-view__send"
                    disabled={!input.trim() || sending}
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            ) : (
              /* Empty state when no conversation is selected */
              <div className="chat-view__placeholder">
                <div className="chat-placeholder__icon">
                  <MessageCircle size={56} strokeWidth={1.2} />
                </div>
                <h3>Doctorji Messaging</h3>
                <p>Select a contact from the list on the left to start a real-time conversation.</p>
                <div className="chat-placeholder__tip">
                  <ShieldAlert size={16} /> 1-on-1 private and secure communication between patients & doctors.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
