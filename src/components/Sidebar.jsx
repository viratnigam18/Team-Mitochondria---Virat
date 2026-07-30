import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthProvider';
import {
  LayoutDashboard,
  MessageCircle,
  User,
  LogOut,
} from 'lucide-react';

export default function Sidebar() {
  const { role, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [totalUnread, setTotalUnread] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const table = role === 'doctor' ? 'doctor_id' : 'patient_id';
      const { data: conns } = await supabase
        .from('connections')
        .select('id')
        .eq(table, user.id)
        .eq('status', 'accepted');

      if (!conns || conns.length === 0) {
        setTotalUnread(0);
        return;
      }

      let total = 0;
      for (const conn of conns) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id)
          .eq('read', false)
          .neq('sender_id', user.id);
        total += count || 0;
      }
      setTotalUnread(total);
    };

    fetchUnread();

    // Re-check on message events
    const channel = supabase
      .channel('sidebar-unread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchUnread()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, role]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const patientLinks = [
    { to: '/patient/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/messages', icon: <MessageCircle size={20} />, label: 'Messages', badge: totalUnread },
    { to: '/triage', icon: <MessageCircle size={20} />, label: 'Triage' },
    { to: '/patient/profile', icon: <User size={20} />, label: 'Profile' },
  ];

  const doctorLinks = [
    { to: '/doctor/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/messages', icon: <MessageCircle size={20} />, label: 'Messages', badge: totalUnread },
    { to: '/doctor/profile', icon: <User size={20} />, label: 'Profile' },
  ];

  const links = role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">🩺</div>
        <span className="sidebar__brand-name">
          Doctor<span>ji</span>
        </span>
      </div>

      {/* Nav links */}
      <nav className="sidebar__nav">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`sidebar__link ${location.pathname === link.to ? 'sidebar__link--active' : ''}`}
          >
            {link.icon}
            <span>{link.label}</span>
            {link.badge > 0 && <span className="sidebar__unread-badge">{link.badge}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom: role badge + logout */}
      <div className="sidebar__footer">
        <span className="sidebar__role">{role}</span>
        <button className="sidebar__logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
