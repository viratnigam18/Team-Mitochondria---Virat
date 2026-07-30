import Navbar from '../components/Navbar';
import { Heart, MessageCircle, FileText, Bell } from 'lucide-react';

/**
 * PatientDashboard — placeholder for the dashboard team.
 *
 * TODO (Dashboard team):
 *   - Fetch patient profile from `supabase.from('patients')`
 *   - Show health summary, triage history
 *   - Link to TriageChat
 *   - Show upcoming appointments
 */
export default function PatientDashboard() {
  return (
    <>
      <Navbar role="Patient" />
      <div className="dashboard-placeholder fade-in">
        <div
          className="dashboard-placeholder__icon"
          style={{ background: '#fef3c7' }}
        >
          <Heart size={36} color="#d97706" />
        </div>
        <h2 className="dashboard-placeholder__title">Patient Dashboard</h2>
        <p className="dashboard-placeholder__desc">
          This page is reserved for the dashboard team. Show health records,
          triage history, and quick actions here.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            width: '100%',
            maxWidth: '600px',
            marginTop: '1.5rem',
          }}
        >
          {[
            { icon: <MessageCircle size={22} />, label: 'AI Triage', count: 'Start' },
            { icon: <FileText size={22} />, label: 'Health Records', count: '—' },
            { icon: <Bell size={22} />, label: 'Notifications', count: '—' },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                padding: '1.25rem',
                background: 'var(--surface-0)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-200)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#d97706',
                  marginBottom: '.5rem',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif",
                  color: 'var(--text-primary)',
                }}
              >
                {card.count}
              </div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
