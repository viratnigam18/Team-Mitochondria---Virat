import Navbar from '../components/Navbar';
import { Stethoscope, Users, Calendar, Activity } from 'lucide-react';

/**
 * DoctorDashboard — placeholder for the dashboard team.
 *
 * TODO (Dashboard team):
 *   - Fetch doctor profile from `supabase.from('doctors')`
 *   - Show patient list / appointments
 *   - Show triage alerts
 *   - Integrate with TriageChat results
 */
export default function DoctorDashboard() {
  return (
    <>
      <Navbar role="Doctor" />
      <div className="dashboard-placeholder fade-in">
        <div className="dashboard-placeholder__icon">
          <Stethoscope size={36} />
        </div>
        <h2 className="dashboard-placeholder__title">Doctor Dashboard</h2>
        <p className="dashboard-placeholder__desc">
          This page is reserved for the dashboard team. Wire up patient lists,
          appointments, and triage alerts here.
        </p>

        {/* Quick-start grid for the dashboard team */}
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
            { icon: <Users size={22} />, label: 'My Patients', count: '—' },
            { icon: <Calendar size={22} />, label: 'Appointments', count: '—' },
            { icon: <Activity size={22} />, label: 'Triage Alerts', count: '—' },
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
                  color: 'var(--primary-500)',
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
