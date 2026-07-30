import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthProvider';
import {
  LayoutDashboard,
  MessageCircle,
  History,
  User,
  LogOut,
  Stethoscope,
} from 'lucide-react';

export default function Sidebar() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const patientLinks = [
    { to: '/patient/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/triage', icon: <MessageCircle size={20} />, label: 'Triage' },
    { to: '/patient/profile', icon: <User size={20} />, label: 'Profile' },
  ];

  const doctorLinks = [
    { to: '/doctor/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
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
