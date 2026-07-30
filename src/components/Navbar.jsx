import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { LogOut, Stethoscope, LayoutDashboard, MessageCircle } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const dashboardPath =
    role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';

  return (
    <nav className="navbar">
      <Link to={dashboardPath} className="navbar__brand">
        🩺 Doctor<span>ji</span>
      </Link>
      <div className="navbar__actions">
        <Link to={dashboardPath} className="btn btn--ghost btn--sm">
          <LayoutDashboard size={16} />
          <span className="navbar__link-text">Dashboard</span>
        </Link>
        {role === 'patient' && (
          <Link to="/triage" className="btn btn--ghost btn--sm">
            <MessageCircle size={16} />
            <span className="navbar__link-text">Triage</span>
          </Link>
        )}
        <span className="navbar__role-badge">{role}</span>
        <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
          <LogOut size={16} />
          <span className="navbar__link-text">Logout</span>
        </button>
      </div>
    </nav>
  );
}
