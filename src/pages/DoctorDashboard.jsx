import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import {
  Users, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  User, MapPin, Droplets, AlertTriangle, Phone, ArrowLeft, Send,
} from 'lucide-react';

const SEVERITY_CFG = {
  green:  { label: 'Low',    color: '#22c55e', bg: '#dcfce7' },
  medium: { label: 'Medium', color: '#eab308', bg: '#fef9c3' },
  red:    { label: 'High',   color: '#ef4444', bg: '#fee2e2' },
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [connectedPatients, setConnectedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientCheckups, setPatientCheckups] = useState([]);
  const [expandedCheckup, setExpandedCheckup] = useState(null);
  const [noteInput, setNoteInput] = useState({});
  const [savingNote, setSavingNote] = useState(null);
  const [updatingConn, setUpdatingConn] = useState(null);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [pendRes, accRes] = await Promise.all([
      supabase.from('connections').select('*, patients(*)').eq('doctor_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('connections').select('*, patients(*)').eq('doctor_id', user.id).eq('status', 'accepted').order('created_at', { ascending: false }),
    ]);
    setPendingRequests(pendRes.data || []);

    const withFlags = await Promise.all(
      (accRes.data || []).map(async (conn) => {
        const { data: lc } = await supabase.from('checkups').select('severity').eq('patient_id', conn.patient_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        return { ...conn, lastSeverity: lc?.severity || null };
      })
    );
    setConnectedPatients(withFlags);
    setLoading(false);
  };

  const updateConn = async (id, status) => {
    setUpdatingConn(id);
    await supabase.from('connections').update({ status }).eq('id', id);
    await fetchData();
    setUpdatingConn(null);
  };

  const viewPatient = async (patient) => {
    setSelectedPatient(patient);
    setExpandedCheckup(null);
    const { data } = await supabase.from('checkups').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false });
    setPatientCheckups(data || []);
  };

  const saveNote = async (checkupId) => {
    const note = noteInput[checkupId];
    if (!note?.trim()) return;
    setSavingNote(checkupId);
    await supabase.from('checkups').update({ doctor_note: note.trim() }).eq('id', checkupId);
    const { data } = await supabase.from('checkups').select('*').eq('patient_id', selectedPatient.id).order('created_at', { ascending: false });
    setPatientCheckups(data || []);
    setNoteInput((prev) => ({ ...prev, [checkupId]: '' }));
    setSavingNote(null);
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--primary-500)', borderColor: 'var(--surface-200)' }} />
        </main>
      </div>
    );
  }

  /* ── Patient Detail View ── */
  if (selectedPatient) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <button className="btn btn--ghost" onClick={() => setSelectedPatient(null)}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </div>

          <div className="patient-profile-card">
            <div className="patient-profile-card__avatar"><User size={32} /></div>
            <div className="patient-profile-card__info">
              <h2>{selectedPatient.full_name}</h2>
              <div className="patient-profile-card__meta">
                {selectedPatient.age && <span>Age: {selectedPatient.age}</span>}
                {selectedPatient.location && <span><MapPin size={13} /> {selectedPatient.location}</span>}
                {selectedPatient.blood_group && <span><Droplets size={13} /> {selectedPatient.blood_group}</span>}
                {selectedPatient.mobile && <span><Phone size={13} /> {selectedPatient.mobile}</span>}
              </div>
              {selectedPatient.allergies && (
                <div className="patient-profile-card__alert">
                  <AlertTriangle size={14} /> Allergies: {selectedPatient.allergies}
                </div>
              )}
              {selectedPatient.prev_health_issue && (
                <div className="patient-profile-card__history">
                  ❤️ Previous Issues: {selectedPatient.prev_health_issue}
                </div>
              )}
            </div>
          </div>

          <h3 className="section-title"><Clock size={18} /> Checkup History ({patientCheckups.length})</h3>
          <div className="checkup-list">
            {patientCheckups.length === 0 ? (
              <div className="empty-state"><Clock size={32} /><p>No checkups yet</p></div>
            ) : (
              patientCheckups.map((c) => (
                <div key={c.id} className="checkup-item">
                  <div className="checkup-item__header" onClick={() => setExpandedCheckup(expandedCheckup === c.id ? null : c.id)}>
                    <div className="checkup-item__left">
                      <span className="severity-dot" style={{ background: SEVERITY_CFG[c.severity]?.color || '#94a3b8' }} />
                      <div>
                        <div className="checkup-item__symptom">
                          {c.symptom_text?.slice(0, 80)}{c.symptom_text?.length > 80 ? '…' : ''}
                        </div>
                        <div className="checkup-item__date">
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {c.severity && (
                            <span className="severity-tag" style={{ background: SEVERITY_CFG[c.severity]?.bg, color: SEVERITY_CFG[c.severity]?.color }}>
                              {SEVERITY_CFG[c.severity]?.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedCheckup === c.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedCheckup === c.id && (
                    <div className="checkup-item__details">
                      <DetailRow label="Symptoms" value={c.symptom_text} />
                      <DetailRow label="Cause" value={c.cause_guess} />
                      <DetailRow label="Home Remedy" value={c.home_remedy} />
                      <DetailRow label="Medicine" value={c.medicine} />
                      <DetailRow label="Food Advice" value={c.food_advice} />
                      <DetailRow label="Avoid" value={c.avoid_list} />
                      <DetailRow label="Future Risk" value={c.future_risk} />
                      {c.doctor_note && <DetailRow label="Your Note" value={c.doctor_note} highlight />}
                      <div className="doctor-note-input">
                        <input
                          className="form-input"
                          placeholder="Add or update your note..."
                          value={noteInput[c.id] || ''}
                          onChange={(e) => setNoteInput((p) => ({ ...p, [c.id]: e.target.value }))}
                        />
                        <button className="btn btn--primary btn--sm" onClick={() => saveNote(c.id)} disabled={savingNote === c.id || !noteInput[c.id]?.trim()}>
                          {savingNote === c.id ? <span className="spinner spinner--sm" /> : <Send size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ── Main Dashboard ── */
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Doctor Dashboard</h1>
            <p className="page-subtitle">Manage your patients and connections</p>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-pill__value">{pendingRequests.length}</span>
            <span className="stat-pill__label">Pending</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__value">{connectedPatients.length}</span>
            <span className="stat-pill__label">My Patients</span>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <>
            <h3 className="section-title"><Clock size={18} /> Pending Requests</h3>
            <div className="cards-grid" style={{ marginBottom: '1.5rem' }}>
              {pendingRequests.map((req) => (
                <div key={req.id} className="patient-request-card">
                  <div className="patient-request-card__info">
                    <div className="patient-request-card__avatar"><User size={20} /></div>
                    <div>
                      <div className="patient-request-card__name">{req.patients?.full_name || 'Unknown'}</div>
                      <div className="patient-request-card__meta">
                        {req.patients?.location && <span><MapPin size={12} /> {req.patients.location}</span>}
                        <span>{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="patient-request-card__actions">
                    <button className="btn btn--primary btn--sm" onClick={() => updateConn(req.id, 'accepted')} disabled={updatingConn === req.id}>
                      <CheckCircle2 size={14} /> Accept
                    </button>
                    <button className="btn btn--outline btn--sm btn--danger-outline" onClick={() => updateConn(req.id, 'rejected')} disabled={updatingConn === req.id}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Connected Patients */}
        <h3 className="section-title"><Users size={18} /> My Patients</h3>
        {connectedPatients.length === 0 ? (
          <div className="empty-state"><Users size={32} /><p>No patients connected yet</p></div>
        ) : (
          <div className="cards-grid">
            {connectedPatients.map((conn) => (
              <div key={conn.id} className="patient-card" onClick={() => viewPatient(conn.patients)}>
                <div className="patient-card__header">
                  <div className="patient-card__avatar"><User size={20} /></div>
                  {conn.lastSeverity && (
                    <span
                      className="severity-dot severity-dot--lg"
                      style={{ background: SEVERITY_CFG[conn.lastSeverity]?.color || '#94a3b8' }}
                      title={`Last: ${SEVERITY_CFG[conn.lastSeverity]?.label}`}
                    />
                  )}
                </div>
                <div className="patient-card__name">{conn.patients?.full_name || 'Unknown'}</div>
                <div className="patient-card__meta">
                  {conn.patients?.location && <span><MapPin size={12} /> {conn.patients.location}</span>}
                  {conn.patients?.blood_group && <span><Droplets size={12} /> {conn.patients.blood_group}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  if (!value) return null;
  return (
    <div className={`detail-row ${highlight ? 'detail-row--highlight' : ''}`}>
      <div className="detail-row__label">{label}</div>
      <div className="detail-row__value">{value}</div>
    </div>
  );
}
