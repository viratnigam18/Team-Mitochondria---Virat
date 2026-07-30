import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut, User } from 'lucide-react';

export default function Navbar({ role }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">
        🩺 Doctor<span>ji</span>
      </Link>
      <div className="navbar__actions">
        {role && (
          <span
            style={{
              fontSize: '.8rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            {role}
          </span>
        )}
        <button className="btn btn--ghost" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </nav>
  );
}
