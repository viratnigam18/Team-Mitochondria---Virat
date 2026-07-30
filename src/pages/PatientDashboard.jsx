import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import ChatWindow from '../components/ChatWindow';
import {
  MessageCircle, Search, UserPlus, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, User, Stethoscope,
  GraduationCap, Building2, MapPin, Phone, Droplets,
  Briefcase, AlertTriangle, X,
} from 'lucide-react';

const NearbyMap = lazy(() => import('../components/NearbyMap'));

const SEVERITY_CFG = {
  green:  { label: 'Low', color: '#22c55e', bg: '#dcfce7', emoji: '🟢' },
  medium: { label: 'Medium', color: '#eab308', bg: '#fef9c3', emoji: '🟡' },
  red:    { label: 'High — Emergency', color: '#ef4444', bg: '#fee2e2', emoji: '🔴' },
};

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('doctors');
  const [myConnections, setMyConnections] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [checkups, setCheckups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCheckup, setExpandedCheckup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [lastCheckup, setLastCheckup] = useState(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(null); // { connectionId, doctorName }
  const [unreadCounts, setUnreadCounts] = useState({}); // { connectionId: count }

  // Toast state
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user]);

  // Realtime: connection status changes (doctor accepted/rejected)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('patient-connections')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connections',
          filter: `patient_id=eq.${user.id}`,
        },
        async (payload) => {
          const updated = payload.new;
          if (updated.status === 'accepted') {
            const { data: doctor } = await supabase
              .from('doctors')
              .select('full_name')
              .eq('id', updated.doctor_id)
              .maybeSingle();
            addToast(`✅ Dr. ${doctor?.full_name || 'Your doctor'} accepted your request!`, 'success');
          } else if (updated.status === 'rejected') {
            addToast(`❌ A doctor declined your request.`, 'error');
          }
          fetchData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, addToast]);

  // Realtime: new chat messages (for unread badges)
  useEffect(() => {
    if (!user) return;

    fetchUnreadCounts();

    const channel = supabase
      .channel('patient-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id !== user.id) {
            if (chatOpen?.connectionId === msg.connection_id) return;

            setUnreadCounts((prev) => ({
              ...prev,
              [msg.connection_id]: (prev[msg.connection_id] || 0) + 1,
            }));

            addToast(`💬 New message from your doctor!`, 'message');
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, chatOpen, addToast]);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    const { data: conns } = await supabase
      .from('connections')
      .select('id')
      .eq('patient_id', user.id)
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
    const [connRes, docRes, checkRes] = await Promise.all([
      supabase.from('connections').select('*, doctors(*)').eq('patient_id', user.id).order('created_at', { ascending: false }),
      supabase.from('doctors').select('*').order('full_name'),
      supabase.from('checkups').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }),
    ]);
    setMyConnections(connRes.data || []);
    setAllDoctors(docRes.data || []);
    setCheckups(checkRes.data || []);
    setLastCheckup((checkRes.data || [])[0] || null);
    setLoading(false);
  };

  const sendRequest = async (doctorId) => {
    setSending(doctorId);
    await supabase.from('connections').insert({ patient_id: user.id, doctor_id: doctorId });
    await fetchData();
    setSending(null);
  };

  const getConn = (doctorId) => myConnections.find((c) => c.doctor_id === doctorId);
  const connectedDoctors = myConnections.filter((c) => c.status === 'accepted');
  const pendingDoctors = myConnections.filter((c) => c.status === 'pending');
  const filteredDoctors = allDoctors.filter((d) => {
    const q = searchQuery.toLowerCase();
    return d.full_name?.toLowerCase().includes(q) || d.speciality?.toLowerCase().includes(q) || d.location?.toLowerCase().includes(q);
  });

  const sev = lastCheckup ? SEVERITY_CFG[lastCheckup.severity] : null;

  const openChat = (connectionId, doctorName) => {
    setChatOpen({ connectionId, doctorName });
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

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Page header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">My Health Dashboard</h1>
            <p className="page-subtitle">Welcome back, {profile?.full_name?.split(' ')[0] || 'Patient'} 👋</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {totalUnread > 0 && (
              <div className="unread-summary">
                <MessageCircle size={16} />
                <span>{totalUnread} unread</span>
              </div>
            )}
            <button className="btn btn--primary" onClick={() => navigate('/triage')}>
              <MessageCircle size={18} /> New Checkup
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-pill__value">{connectedDoctors.length}</span>
            <span className="stat-pill__label">My Doctors</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__value">{pendingDoctors.length}</span>
            <span className="stat-pill__label">Pending</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill__value">{checkups.length}</span>
            <span className="stat-pill__label">Checkups</span>
          </div>
        </div>

        {/* 3-column grid: left panel | map | right panel */}
        <div className="dashboard-grid">
          {/* ── LEFT: Summary + Quick Actions ── */}
          <div className="dashboard-grid__left">
            {/* Symptom quick entry */}
            <div className="widget-card">
              <div className="widget-card__title">
                <MessageCircle size={16} /> Symptom Checker
              </div>
              <button className="symptom-quick-btn" onClick={() => navigate('/triage')}>
                🎙️ Describe your symptoms...
              </button>
            </div>

            {/* Emergency severity */}
            <div className="widget-card">
              <div className="widget-card__title">
                <AlertTriangle size={16} /> Last Checkup Severity
              </div>
              {sev ? (
                <div className="severity-gauge" style={{ background: sev.bg }}>
                  <div className="severity-gauge__emoji">{sev.emoji}</div>
                  <div className="severity-gauge__label" style={{ color: sev.color }}>
                    {sev.label.toUpperCase()}
                  </div>
                  {lastCheckup?.cause_guess && (
                    <div className="severity-gauge__cause">
                      {lastCheckup.cause_guess.slice(0, 60)}...
                    </div>
                  )}
                </div>
              ) : (
                <div className="severity-gauge severity-gauge--empty">
                  <span>No checkups yet</span>
                </div>
              )}
            </div>

            {/* AI Recommendation */}
            {lastCheckup && (
              <div className="widget-card">
                <div className="widget-card__title">🤖 AI Recommendation</div>
                <ul className="ai-recs">
                  {lastCheckup.home_remedy && <li>{lastCheckup.home_remedy.slice(0, 80)}</li>}
                  {lastCheckup.medicine && <li>{lastCheckup.medicine.slice(0, 60)}</li>}
                  {lastCheckup.avoid_list && <li>Avoid: {lastCheckup.avoid_list.slice(0, 50)}</li>}
                </ul>
              </div>
            )}

            {/* Call ambulance */}
            <a href="tel:102" className="btn btn--danger btn--full ambulance-btn">
              🚑 Call Ambulance (102)
            </a>
          </div>

          {/* ── CENTER: Map ── */}
          <div className="dashboard-grid__map">
            <Suspense fallback={<div className="map-skeleton">Loading map...</div>}>
              <NearbyMap onHospitalsFound={setHospitals} />
            </Suspense>
          </div>

          {/* ── RIGHT: Hospital directory + activity ── */}
          <div className="dashboard-grid__right">
            {/* Recent activity */}
            <div className="widget-card">
              <div className="widget-card__title">
                <Clock size={16} /> Recent Activity
              </div>
              {checkups.length === 0 ? (
                <p className="widget-empty">No checkups yet</p>
              ) : (
                <div className="activity-list">
                  {checkups.slice(0, 4).map((c) => (
                    <div key={c.id} className="activity-item">
                      <span
                        className="severity-dot"
                        style={{ background: SEVERITY_CFG[c.severity]?.color || '#94a3b8' }}
                      />
                      <div className="activity-item__text">
                        <div className="activity-item__symptom">
                          {c.symptom_text?.slice(0, 40)}{c.symptom_text?.length > 40 ? '…' : ''}
                        </div>
                        <div className="activity-item__date">
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span className="activity-item__tag">AI Analysis</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nearby Hospital Directory */}
            <div className="widget-card">
              <div className="widget-card__title">
                <Building2 size={16} /> Nearby Hospital Directory
              </div>
              {hospitals.length === 0 ? (
                <p className="widget-empty">Loading nearby hospital directory...</p>
              ) : (
                <div className="hospital-list">
                  {hospitals.map((h) => (
                    <div key={h.id} className="hospital-item">
                      <div className="hospital-item__info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className="hospital-item__name">{h.name}</span>
                          {h.tag && (
                            <span
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: '700',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '999px',
                                background: 'rgba(20, 184, 166, 0.15)',
                                color: '#0d9488',
                              }}
                            >
                              {h.tag}
                            </span>
                          )}
                        </div>
                        <div className="hospital-item__dist">
                          <MapPin size={11} /> {h.subtitle || `${h.dist} km away`}
                        </div>
                        {h.rating && (
                          <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>
                            ★ {h.rating} ({h.stars} reviews)
                          </div>
                        )}
                        {h.desc && (
                          <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.2rem', lineHeight: '1.3' }}>
                            {h.desc}
                          </div>
                        )}
                        {h.phone && (
                          <div className="hospital-item__phone" style={{ marginTop: '0.2rem' }}>
                            <Phone size={11} /> {h.phone}
                          </div>
                        )}
                      </div>
                      <a
                        href={h.mapsUrl || (h.phone ? `tel:${h.phone}` : `https://maps.google.com/?q=${h.lat},${h.lon}`)}
                        target={h.phone ? '_self' : '_blank'}
                        rel="noopener noreferrer"
                        className="hospital-call-btn"
                        title="View on Google Maps / Call"
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs section ── */}
        <div className="tabs-section">
          <div className="tabs-bar">
            {[
              { id: 'doctors', label: '🩺 My Doctors' },
              { id: 'find', label: '🔍 Find Doctor' },
              { id: 'history', label: '📋 Checkup History' },
            ].map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'tab-btn--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tabs-content">
            {/* My Doctors */}
            {tab === 'doctors' && (
              <div className="cards-grid">
                {connectedDoctors.length === 0 && pendingDoctors.length === 0 ? (
                  <div className="empty-state">
                    <Stethoscope size={32} />
                    <p>No doctor connections yet</p>
                    <button className="btn btn--primary btn--sm" onClick={() => setTab('find')}>
                      Find a Doctor
                    </button>
                  </div>
                ) : (
                  [...connectedDoctors, ...pendingDoctors].map((conn) => (
                    <DoctorCard
                      key={conn.id}
                      doctor={conn.doctors}
                      status={conn.status}
                      connectionId={conn.id}
                      unreadCount={unreadCounts[conn.id] || 0}
                      onChat={() => openChat(conn.id, conn.doctors?.full_name || 'Doctor')}
                    />
                  ))
                )}
              </div>
            )}

            {/* Find Doctor */}
            {tab === 'find' && (
              <>
                <div className="search-bar">
                  <Search size={18} className="search-bar__icon" />
                  <input
                    className="form-input search-bar__input"
                    placeholder="Search by name, speciality, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="cards-grid">
                  {filteredDoctors.map((doc) => {
                    const conn = getConn(doc.id);
                    return (
                      <DoctorCard
                        key={doc.id}
                        doctor={doc}
                        status={conn?.status}
                        onConnect={() => sendRequest(doc.id)}
                        connecting={sending === doc.id}
                      />
                    );
                  })}
                  {filteredDoctors.length === 0 && (
                    <div className="empty-state"><Search size={32} /><p>No doctors found</p></div>
                  )}
                </div>
              </>
            )}

            {/* Checkup History */}
            {tab === 'history' && (
              <div className="checkup-list">
                {checkups.length === 0 ? (
                  <div className="empty-state">
                    <Clock size={32} /><p>No checkups yet</p>
                    <button className="btn btn--primary btn--sm" onClick={() => navigate('/triage')}>
                      Start first checkup
                    </button>
                  </div>
                ) : (
                  checkups.map((c) => (
                    <div key={c.id} className="checkup-item">
                      <div
                        className="checkup-item__header"
                        onClick={() => setExpandedCheckup(expandedCheckup === c.id ? null : c.id)}
                      >
                        <div className="checkup-item__left">
                          <span className="severity-dot" style={{ background: SEVERITY_CFG[c.severity]?.color || '#94a3b8' }} />
                          <div>
                            <div className="checkup-item__symptom">
                              {c.symptom_text?.slice(0, 60)}{c.symptom_text?.length > 60 ? '…' : ''}
                            </div>
                            <div className="checkup-item__date">
                              {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        {expandedCheckup === c.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                      {expandedCheckup === c.id && (
                        <div className="checkup-item__details">
                          <DetailRow label="Symptoms" value={c.symptom_text} />
                          <DetailRow label="Possible Cause" value={c.cause_guess} />
                          <DetailRow label="Home Remedy" value={c.home_remedy} />
                          <DetailRow label="Medicine" value={c.medicine} />
                          <DetailRow label="Food Advice" value={c.food_advice} />
                          <DetailRow label="Avoid" value={c.avoid_list} />
                          <DetailRow label="Future Risk" value={c.future_risk} />
                          {c.doctor_note && <DetailRow label="Doctor's Note" value={c.doctor_note} highlight />}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Chat panel */}
      {chatOpen && (
        <ChatWindow
          connectionId={chatOpen.connectionId}
          currentUserId={user.id}
          otherUserName={chatOpen.doctorName}
          onClose={closeChat}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

/* ── Sub-components ── */
function DoctorCard({ doctor, status, onConnect, connecting, connectionId, unreadCount, onChat }) {
  if (!doctor) return null;
  return (
    <div className="doctor-card">
      <div className="doctor-card__avatar"><Stethoscope size={22} /></div>
      <div className="doctor-card__info">
        <div className="doctor-card__name">{doctor.full_name}</div>
        <div className="doctor-card__meta">
          {doctor.speciality && <span><GraduationCap size={12} /> {doctor.speciality}</span>}
          {doctor.degree && <span><Briefcase size={12} /> {doctor.degree}</span>}
          {doctor.clinic_name && <span><Building2 size={12} /> {doctor.clinic_name}</span>}
          {doctor.location && <span><MapPin size={12} /> {doctor.location}</span>}
        </div>
      </div>
      <div className="doctor-card__action">
        {status === 'accepted' ? (
          <div className="doctor-card__connected-actions">
            <span className="status-badge status-badge--accepted"><CheckCircle2 size={13} /> Connected</span>
            {onChat && (
              <button className="btn btn--outline btn--sm btn--chat" onClick={onChat}>
                <MessageCircle size={13} />
                Chat
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
              </button>
            )}
          </div>
        ) : status === 'pending' ? (
          <span className="status-badge status-badge--pending"><Clock size={13} /> Pending</span>
        ) : status === 'rejected' ? (
          <span className="status-badge status-badge--rejected"><XCircle size={13} /> Rejected</span>
        ) : onConnect ? (
          <button className="btn btn--primary btn--sm" onClick={onConnect} disabled={connecting}>
            {connecting ? <span className="spinner spinner--sm" /> : <><UserPlus size={13} /> Connect</>}
          </button>
        ) : null}
      </div>
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
