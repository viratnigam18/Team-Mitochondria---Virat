import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { analyzeSymptom } from '../lib/analyzeSymptom';
import { generateChatTitle } from '../lib/generateChatTitle';
import { useVoiceRecorder } from '../lib/useVoiceRecorder';
import { transcribeAudio } from '../lib/transcribeAudio';
import { calculateAge } from '../lib/utils';
import {
  Send, Mic, MicOff, Bot, User, AlertTriangle,
  Phone, MapPin, Loader, Globe, Plus, Clock,
  MessageSquare, ChevronRight, CheckCircle, Sparkles,
} from 'lucide-react';

const WELCOME_MSG = {
  role: 'ai', type: 'text',
  content: 'Namaste! 🙏 I\'m Doctorji, your AI health assistant. Describe your symptoms (type or use the mic) and I\'ll help you understand what might be going on.\n\n⚠️ I am not a real doctor — always see a qualified physician for serious issues.',
};

export default function TriageChat() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSessionId = searchParams.get('session');

  // ── Session state ──
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState('');
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // ── Chat state ──
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef(null);
  const { isRecording, startRecording, stopRecording, error: micError } = useVoiceRecorder();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const patientContext = {
    age: profile?.dob ? calculateAge(profile.dob) : profile?.age,
    allergies: profile?.allergies || 'None',
    prevHealthIssue: profile?.prev_health_issue || 'None',
  };

  // ── Load sessions on mount or when URL session parameter changes ──
  useEffect(() => {
    if (!user) return;
    loadSessions(urlSessionId);
  }, [user, urlSessionId]);

  const loadSessions = async (targetSessionId) => {
    setSessionsLoading(true);
    const { data } = await supabase
      .from('triage_sessions')
      .select('id, title, severity, checkup_id, created_at, updated_at')
      .eq('patient_id', user.id)
      .order('updated_at', { ascending: false });

    const sessionsList = data || [];
    setSessions(sessionsList);

    if (targetSessionId) {
      const found = sessionsList.find((s) => s.id === targetSessionId);
      if (found) {
        await loadSession(found.id);
        setSessionsLoading(false);
        return;
      }
    }

    // Default: find an active (incomplete) session to resume or load the latest
    const activeSession = sessionsList.find((s) => !s.checkup_id) || sessionsList[0];
    if (activeSession) {
      await loadSession(activeSession.id);
    }
    setSessionsLoading(false);
  };

  const loadSession = async (sessionId) => {
    const { data } = await supabase
      .from('triage_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (data) {
      setActiveSessionId(data.id);
      setActiveSessionTitle(data.title || 'Health Triage');
      const parsedMessages = data.messages || [];
      setMessages(parsedMessages.length > 0 ? parsedMessages : [WELCOME_MSG]);
      setIsCompleted(!!data.checkup_id);
    }
  };

  // ── Create a new session ──
  const createNewSession = async () => {
    // Save current session first if it has content
    if (activeSessionId && messages.length > 1) {
      await saveSessionMessages(activeSessionId, messages);
    }

    setActiveSessionId(null);
    setActiveSessionTitle('');
    setMessages([WELCOME_MSG]);
    setPendingFollowUp(null);
    setIsCompleted(false);
    setInput('');
    setSearchParams({});
  };

  // ── Save messages to the active session ──
  const saveSessionMessages = useCallback(async (sessionId, msgs, extra = {}) => {
    if (!sessionId || !user) return;
    await supabase
      .from('triage_sessions')
      .update({ messages: msgs, updated_at: new Date().toISOString(), ...extra })
      .eq('id', sessionId);
  }, [user]);

  // ── Create or update session on first user message with AI Title ──
  const ensureSession = async (userText) => {
    if (activeSessionId) return activeSessionId;

    // Create initial session with temporary title
    const tempTitle = userText.slice(0, 40) + (userText.length > 40 ? '…' : '');
    const { data, error } = await supabase
      .from('triage_sessions')
      .insert({
        patient_id: user.id,
        title: tempTitle,
        messages: [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create triage session:', error.message);
      return null;
    }

    const newId = data.id;
    setActiveSessionId(newId);
    setActiveSessionTitle(tempTitle);

    // Refresh sessions list locally
    const newSessionObj = {
      id: newId,
      title: tempTitle,
      severity: null,
      checkup_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSessions((prev) => [newSessionObj, ...prev]);

    // Asynchronously generate AI Medical Title and update DB + UI
    generateChatTitle(userText).then(async (aiTitle) => {
      if (aiTitle && aiTitle !== tempTitle) {
        setActiveSessionTitle(aiTitle);
        setSessions((prev) => prev.map((s) => s.id === newId ? { ...s, title: aiTitle } : s));
        await supabase
          .from('triage_sessions')
          .update({ title: aiTitle })
          .eq('id', newId);
      }
    });

    return newId;
  };

  // ── Analyze symptoms ──
  const doAnalyze = async (text, currentMessages) => {
    setLoading(true);
    try {
      const symptomText = pendingFollowUp ? `${pendingFollowUp}\n\nAdditional info: ${text}` : text;
      const result = await analyzeSymptom(symptomText, patientContext, user?.id);

      let updatedMessages;
      if (result.follow_up_question && !pendingFollowUp) {
        setPendingFollowUp(text);
        updatedMessages = [...currentMessages, { role: 'ai', type: 'text', content: result.follow_up_question }];
      } else {
        setPendingFollowUp(null);
        updatedMessages = [...currentMessages, { role: 'ai', type: 'result', data: result }];
      }

      setMessages(updatedMessages);

      // Save to session
      const sessionId = activeSessionId;
      if (sessionId) {
        const extra = {};
        // If analysis is complete (has result card), mark session as completed
        if (!result.follow_up_question && result.saved && result.checkupId) {
          extra.severity = result.severity;
          extra.checkup_id = result.checkupId;
          setIsCompleted(true);

          // Update sessions list
          setSessions((prev) => prev.map((s) =>
            s.id === sessionId ? { ...s, severity: result.severity, checkup_id: result.checkupId } : s
          ));
        }
        await saveSessionMessages(sessionId, updatedMessages, extra);
      }
    } catch (err) {
      const errMessages = [...currentMessages, { role: 'ai', type: 'text', content: `❌ ${err.message}` }];
      setMessages(errMessages);
      if (activeSessionId) await saveSessionMessages(activeSessionId, errMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    // Ensure session exists
    const sessionId = await ensureSession(text);

    const updatedMessages = [...messages, { role: 'user', type: 'text', content: text }];
    setMessages(updatedMessages);

    // Save user message immediately
    if (sessionId) await saveSessionMessages(sessionId, updatedMessages);

    await doAnalyze(text, updatedMessages);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (!blob) return;
      setTranscribing(true);
      setMessages((prev) => [...prev, { role: 'user', type: 'text', content: '🎙️ Transcribing...' }]);
      try {
        const transcript = await transcribeAudio(blob, language);
        if (transcript) {
          setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'user', type: 'text', content: transcript }; return u; });
          setTranscribing(false);

          const sessionId = await ensureSession(transcript);
          const updatedMessages = messages.slice(0, -1);
          updatedMessages.push({ role: 'user', type: 'text', content: transcript });
          if (sessionId) await saveSessionMessages(sessionId, updatedMessages);

          await doAnalyze(transcript, updatedMessages);
        } else {
          setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'ai', type: 'text', content: 'Could not understand. Please try again.' }; return u; });
        }
      } catch (err) {
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'ai', type: 'text', content: `❌ Transcription: ${err.message}` }; return u; });
      } finally {
        setTranscribing(false);
      }
    } else {
      startRecording();
    }
  };

  const SEVERITY_CFG = {
    green:  { label: 'Low Severity', color: '#22c55e', bg: '#dcfce7', dot: '#22c55e' },
    medium: { label: 'Medium Severity', color: '#eab308', bg: '#fef9c3', dot: '#eab308' },
    red:    { label: 'High Severity — Emergency', color: '#ef4444', bg: '#fee2e2', dot: '#ef4444' },
  };

  const handleSessionClick = async (session) => {
    if (session.id === activeSessionId) return;

    // Save current messages before switching
    if (activeSessionId && messages.length > 1) {
      await saveSessionMessages(activeSessionId, messages);
    }

    setSearchParams({ session: session.id });
    await loadSession(session.id);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content triage-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Triage Chat</h1>
            <p className="page-subtitle">
              {activeSessionTitle ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                  <Sparkles size={14} /> Topic: {activeSessionTitle}
                </span>
              ) : (
                'Describe your symptoms — AI will analyze and advise'
              )}
            </p>
          </div>
        </div>

        <div className="triage-layout">
          {/* ── Sessions Sidebar ── */}
          <div className="triage-sessions-panel">
            <button className="triage-sessions-panel__new-btn" onClick={createNewSession}>
              <Plus size={16} /> New Chat
            </button>

            <div className="triage-sessions-panel__list">
              {sessionsLoading ? (
                <div className="triage-sessions-panel__empty">
                  <Loader size={16} className="spin" /> Loading...
                </div>
              ) : sessions.length === 0 ? (
                <div className="triage-sessions-panel__empty">
                  <MessageSquare size={16} />
                  <span>No previous chats</span>
                </div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    className={`triage-session-item ${s.id === activeSessionId ? 'triage-session-item--active' : ''} ${s.checkup_id ? 'triage-session-item--completed' : ''}`}
                    onClick={() => handleSessionClick(s)}
                  >
                    <div className="triage-session-item__header">
                      {s.severity && (
                        <span
                          className="severity-dot"
                          style={{ background: SEVERITY_CFG[s.severity]?.dot || '#94a3b8' }}
                        />
                      )}
                      <span className="triage-session-item__title">
                        {s.title || 'New Chat'}
                      </span>
                    </div>
                    <div className="triage-session-item__meta">
                      <Clock size={11} />
                      {new Date(s.updated_at || s.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Chat Area ── */}
          <div className="triage-container">
            {/* Completed session banner */}
            {isCompleted && (
              <div className="triage-completed-banner">
                <CheckCircle size={14} />
                <span>This conversation is complete. Start a <button onClick={createNewSession}>new chat</button> to describe new symptoms.</span>
              </div>
            )}

            {/* Messages */}
            <div className="triage-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`triage-msg ${msg.role === 'user' ? 'triage-msg--user' : 'triage-msg--ai'}`}>
                  <div className="triage-msg__avatar">
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="triage-msg__content">
                    {msg.type === 'text' && <div className="triage-msg__bubble">{msg.content}</div>}
                    {msg.type === 'result' && <ResultCard data={msg.data} severityConfig={SEVERITY_CFG} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="triage-msg triage-msg--ai">
                  <div className="triage-msg__avatar"><Bot size={16} /></div>
                  <div className="triage-msg__content">
                    <div className="triage-msg__bubble triage-msg__typing">
                      <Loader size={16} className="spin" /> Analyzing symptoms...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            {!isCompleted && (
              <div className="triage-input-bar">
                <button
                  className={`triage-lang-btn ${language === 'hi' ? 'triage-lang-btn--active' : ''}`}
                  onClick={() => setLanguage((l) => l === 'en' ? 'hi' : 'en')}
                  title="Toggle Hindi/English"
                >
                  <Globe size={16} />
                  <span>{language === 'en' ? 'EN' : 'हि'}</span>
                </button>
                <input
                  className="form-input triage-input"
                  placeholder={language === 'en' ? 'Describe your symptoms...' : 'अपने लक्षण बताएं...'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || transcribing}
                />
                <button
                  className={`triage-mic-btn ${isRecording ? 'triage-mic-btn--recording' : ''}`}
                  onClick={handleMicToggle}
                  disabled={loading || transcribing}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                  {isRecording && <span className="triage-mic-btn__pulse" />}
                </button>
                <button className="btn btn--primary triage-send-btn" onClick={handleSend} disabled={loading || !input.trim() || transcribing}>
                  <Send size={18} />
                </button>
              </div>
            )}
            {micError && <div className="alert alert--error" style={{ margin: '0 1rem .5rem' }}>{micError}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultCard({ data, severityConfig }) {
  const sev = severityConfig[data.severity] || severityConfig.medium;
  return (
    <div className="result-card">
      <div className="result-card__severity" style={{ background: sev.bg, color: sev.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={18} /><span>{sev.label}</span>
        </div>
        {data.saved && (
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.7)', color: '#065f46', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
            📋 Saved to History
          </span>
        )}
      </div>
      {data.saveError && (
        <div className="alert alert--error" style={{ margin: '0.5rem', fontSize: '0.8rem' }}>
          ⚠️ Could not save to history: {data.saveError}
        </div>
      )}
      {data.severity === 'red' && (
        <div className="result-card__emergency">
          <div className="result-card__emergency-text"><AlertTriangle size={20} /><strong>Needs immediate medical attention!</strong></div>
          <div className="result-card__emergency-actions">
            <a href="tel:112" className="btn btn--danger btn--sm"><Phone size={16} /> Call 112</a>
            <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
              <MapPin size={16} /> Nearest Hospital
            </a>
          </div>
        </div>
      )}
      <div className="result-card__fields">
        {[
          ['🔍 Possible Cause', data.cause_guess],
          ['🏠 Home Remedy', data.home_remedy],
          ['💊 Medicine', data.medicine],
          ['🍎 Food Advice', data.food_advice],
          ['🚫 Avoid', data.avoid_list],
          ['⚠️ Future Risk', data.future_risk],
        ].map(([label, val]) =>
          val ? (
            <div key={label} className="result-field">
              <div className="result-field__label">{label}</div>
              <div className="result-field__value">{val}</div>
            </div>
          ) : null
        )}
      </div>
      <div className="result-card__disclaimer">⚕️ AI-generated advice. Always consult a qualified doctor.</div>
    </div>
  );
}
