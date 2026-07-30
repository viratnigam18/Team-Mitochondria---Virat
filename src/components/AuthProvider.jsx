import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null,
  loading: true,
  refreshProfile: () => {},
});

/**
 * Provides auth state (user, role, profile) to the entire app.
 * Wrap <App /> with this in main.jsx.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the profile from the correct table based on role
  const fetchProfile = async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setRole(null);
      return;
    }

    const userRole = authUser.user_metadata?.role;
    setRole(userRole);

    if (userRole === 'doctor') {
      const { data } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      setProfile(data);
    } else if (userRole === 'patient') {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      setProfile(data);
    }
  };

  /**
   * Call this after updating the profile in the database
   * so the in-memory profile state stays in sync.
   */
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      fetchProfile(authUser).then(() => setLoading(false));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      fetchProfile(authUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any component.
 * Returns { user, role, profile, loading }
 */
export function useAuth() {
  return useContext(AuthContext);
}
