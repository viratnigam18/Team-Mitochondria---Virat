import { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { analyzeSymptom } from '../lib/analyzeSymptom';
import { useVoiceRecorder } from '../lib/useVoiceRecorder';
import { transcribeAudio } from '../lib/transcribeAudio';
import { calculateAge } from '../lib/utils';
import {
  Send, Mic, MicOff, Bot, User, AlertTriangle,
  Phone, MapPin, Loader, Globe,
} from 'lucide-react';

export default function TriageChat() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'ai', type: 'text',
      content: 'Namaste! 🙏 I\'m Doctorji, your AI health assistant. Describe your symptoms (type or use the mic) and I\'ll help you understand what might be going on.\n\n⚠️ I am not a real doctor — always see a qualified physician for serious issues.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const messagesEndRef = useRef(null);
  const { isRecording, startRecording, stopRecording, error: micError } = useVoiceRecorder();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const patientContext = {
    age: profile?.dob ? calculateAge(profile.dob) : profile?.age,
    allergies: profile?.allergies || 'None',
    prevHealthIssue: profile?.prev_health_issue || 'None',
  };

  const doAnalyze = async (text) => {
    setLoading(true);
    try {
      const symptomText = pendingFollowUp ? `${pendingFollowUp}\n\nAdditional info: ${text}` : text;
      const result = await analyzeSymptom(symptomText, patientContext, user?.id);

      if (result.follow_up_question && !pendingFollowUp) {
        setPendingFollowUp(text);
        setMessages((prev) => [...prev, { role: 'ai', type: 'text', content: result.follow_up_question }]);
      } else {
        setPendingFollowUp(null);
        setMessages((prev) => [...prev, { role: 'ai', type: 'result', data: result }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', type: 'text', content: `❌ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', type: 'text', content: text }]);
    await doAnalyze(text);
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
          await doAnalyze(transcript);
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
    green:  { label: 'Low Severity', color: '#22c55e', bg: '#dcfce7' },
    medium: { label: 'Medium Severity', color: '#eab308', bg: '#fef9c3' },
    red:    { label: 'High Severity — Emergency', color: '#ef4444', bg: '#fee2e2' },
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content triage-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Triage Chat</h1>
            <p className="page-subtitle">Describe your symptoms — AI will analyze and advise</p>
          </div>
        </div>

        <div className="triage-container">
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
          {micError && <div className="alert alert--error" style={{ margin: '0 1rem .5rem' }}>{micError}</div>}
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
