import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import ChatWindow from '../components/ChatWindow';
import {
  Users, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  User, MapPin, Droplets, AlertTriangle, Phone, ArrowLeft, Send,
  MessageCircle, X, Bell,
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

  // Chat state
  const [chatOpen, setChatOpen] = useState(null); // { connectionId, patientName }
  const [unreadCounts, setUnreadCounts] = useState({}); // { connectionId: count }

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user]);

  // Realtime subscription for new connection requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('doctor-connections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
          filter: `doctor_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new.status === 'pending') {
            // Fetch patient name for the toast
            const { data: patient } = await supabase
              .from('patients')
              .select('full_name')
              .eq('id', payload.new.patient_id)
              .maybeSingle();

            const name = patient?.full_name || 'A patient';
            addToast(`🔔 New request from ${name}!`, 'request');
            fetchData(); // Refresh lists
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, addToast]);

  // Realtime subscription for new chat messages (for unread badges)
  useEffect(() => {
    if (!user) return;

    // Fetch initial unread counts
    fetchUnreadCounts();

    const channel = supabase
      .channel('doctor-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new;
          // Only count messages from others
          if (msg.sender_id !== user.id) {
            // If chat is open for this connection, don't increment
            if (chatOpen?.connectionId === msg.connection_id) return;

            setUnreadCounts((prev) => ({
              ...prev,
              [msg.connection_id]: (prev[msg.connection_id] || 0) + 1,
            }));

            addToast(`💬 New message received!`, 'message');
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, chatOpen, addToast]);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    // Get all accepted connections for this doctor
    const { data: conns } = await supabase
      .from('connections')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('status', 'accepted');

    if (!conns || conns.length === 0) return;

    const counts = {};
    for (const conn of conns) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', conn.id)
        .eq('read', false)
        .neq('sender_id', user.id);

      if (count > 0) counts[conn.id] = count;
    }
    setUnreadCounts(counts);
  };

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

  const openChat = (connectionId, patientName) => {
    setChatOpen({ connectionId, patientName });
    // Clear unread for this connection
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[connectionId];
      return next;
    });
  };

  const closeChat = () => {
    setChatOpen(null);
    fetchUnreadCounts();
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
    // Find connection for this patient to enable chat
    const patientConn = connectedPatients.find((c) => c.patient_id === selectedPatient.id);

    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <button className="btn btn--ghost" onClick={() => setSelectedPatient(null)}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
            {patientConn && (
              <button
                className="btn btn--primary"
                onClick={() => openChat(patientConn.id, selectedPatient.full_name)}
              >
                <MessageCircle size={18} /> Chat with {selectedPatient.full_name?.split(' ')[0]}
              </button>
            )}
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

        {/* Chat panel */}
        {chatOpen && (
          <ChatWindow
            connectionId={chatOpen.connectionId}
            currentUserId={user.id}
            otherUserName={chatOpen.patientName}
            onClose={closeChat}
          />
        )}

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </div>
    );
  }

  /* ── Main Dashboard ── */
  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Doctor Dashboard</h1>
            <p className="page-subtitle">Manage your patients and connections</p>
          </div>
          {totalUnread > 0 && (
            <div className="unread-summary">
              <MessageCircle size={18} />
              <span>{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</span>
            </div>
          )}
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
          <div className="stat-pill">
            <span className="stat-pill__value">{totalUnread}</span>
            <span className="stat-pill__label">Unread</span>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <>
            <h3 className="section-title"><Bell size={18} /> Pending Requests</h3>
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
              <div key={conn.id} className="patient-card">
                <div className="patient-card__header" onClick={() => viewPatient(conn.patients)}>
                  <div className="patient-card__avatar"><User size={20} /></div>
                  {conn.lastSeverity && (
                    <span
                      className="severity-dot severity-dot--lg"
                      style={{ background: SEVERITY_CFG[conn.lastSeverity]?.color || '#94a3b8' }}
                      title={`Last: ${SEVERITY_CFG[conn.lastSeverity]?.label}`}
                    />
                  )}
                </div>
                <div className="patient-card__name" onClick={() => viewPatient(conn.patients)}>
                  {conn.patients?.full_name || 'Unknown'}
                </div>
                <div className="patient-card__meta">
                  {conn.patients?.location && <span><MapPin size={12} /> {conn.patients.location}</span>}
                  {conn.patients?.blood_group && <span><Droplets size={12} /> {conn.patients.blood_group}</span>}
                </div>
                <div className="patient-card__actions">
                  <button
                    className="btn btn--outline btn--sm btn--chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      openChat(conn.id, conn.patients?.full_name || 'Patient');
                    }}
                  >
                    <MessageCircle size={14} />
                    Chat
                    {unreadCounts[conn.id] > 0 && (
                      <span className="unread-badge">{unreadCounts[conn.id]}</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Chat panel */}
      {chatOpen && (
        <ChatWindow
          connectionId={chatOpen.connectionId}
          currentUserId={user.id}
          otherUserName={chatOpen.patientName}
          onClose={closeChat}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

/* ── Toast Container ── */
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast__message">{toast.message}</span>
          <button className="toast__close" onClick={() => onDismiss(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
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
