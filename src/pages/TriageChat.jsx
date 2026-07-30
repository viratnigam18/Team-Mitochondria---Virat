import Navbar from '../components/Navbar';
import { Bot, Send } from 'lucide-react';

/**
 * TriageChat — placeholder for the LLM team.
 *
 * TODO (LLM / AI team):
 *   - Connect to your small LLM model endpoint
 *   - Build the chat UI with message bubbles
 *   - Store triage results in Supabase
 *   - Add symptom-to-urgency classification
 *
 * NOTE: This file is OWNED by the LLM integration person.
 *       Please do not modify the AI logic here.
 */
export default function TriageChat() {
  return (
    <>
      <Navbar role="Triage" />
      <div className="dashboard-placeholder fade-in">
        <div
          className="dashboard-placeholder__icon"
          style={{ background: 'var(--primary-50)' }}
        >
          <Bot size={36} color="var(--primary-600)" />
        </div>
        <h2 className="dashboard-placeholder__title">AI Triage Chat</h2>
        <p className="dashboard-placeholder__desc">
          This page is reserved for the LLM integration team. Build the
          symptom chat interface and connect your model here.
        </p>

        {/* Skeleton chat UI for reference */}
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
            marginTop: '1.5rem',
            border: '1px solid var(--surface-200)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem',
              background: 'var(--surface-0)',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '.9rem',
            }}
          >
            Chat messages will appear here…
          </div>
          <div
            style={{
              display: 'flex',
              gap: '.5rem',
              padding: '.75rem',
              borderTop: '1px solid var(--surface-200)',
              background: 'var(--surface-50)',
            }}
          >
            <input
              className="form-input"
              placeholder="Describe your symptoms…"
              disabled
              style={{ flex: 1 }}
            />
            <button className="btn btn--primary" disabled>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
