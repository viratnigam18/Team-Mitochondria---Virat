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
 *
 * Self-healing: if a user is logged in with role metadata but has no
 * profile row in the database, this provider auto-creates it from the
 * auth user_metadata. This handles cases where the signup INSERT failed
 * (e.g. RLS timing, network issues).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Auto-create a missing doctor profile row from auth user_metadata.
   */
  const autoCreateDoctorProfile = async (authUser) => {
    const meta = authUser.user_metadata || {};
    const profileData = {
      id: authUser.id,
      full_name: meta.full_name || 'Doctor',
      dob: meta.dob || null,
      age: meta.age || null,
      mobile: meta.mobile || null,
      email: authUser.email,
      location: meta.location || null,
      degree: meta.degree || null,
      certification: meta.certification || null,
      dr_card_link: meta.dr_card_link || null,
      speciality: meta.speciality || null,
      experience: meta.experience ? parseInt(meta.experience) : null,
      clinic_name: meta.clinic_name || null,
    };

    console.log('[AuthProvider] Auto-creating missing doctor profile for:', authUser.email);
    const { data, error } = await supabase
      .from('doctors')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[AuthProvider] Failed to auto-create doctor profile:', error.message);
      return null;
    }
    console.log('[AuthProvider] Doctor profile auto-created successfully');
    return data;
  };

  /**
   * Auto-create a missing patient profile row from auth user_metadata.
   */
  const autoCreatePatientProfile = async (authUser) => {
    const meta = authUser.user_metadata || {};
    const profileData = {
      id: authUser.id,
      full_name: meta.full_name || 'Patient',
      dob: meta.dob || null,
      age: meta.age || null,
      mobile: meta.mobile || null,
      email: authUser.email,
      location: meta.location || null,
      prev_health_issue: meta.prev_health_issue || null,
      blood_group: meta.blood_group || null,
      allergies: meta.allergies || null,
      emergency_contact: meta.emergency_contact || null,
    };

    console.log('[AuthProvider] Auto-creating missing patient profile for:', authUser.email);
    const { data, error } = await supabase
      .from('patients')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[AuthProvider] Failed to auto-create patient profile:', error.message);
      return null;
    }
    console.log('[AuthProvider] Patient profile auto-created successfully');
    return data;
  };

  // Fetch the profile from the correct table based on role.
  // If no row exists, auto-create it from auth metadata (self-healing).
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

      if (data) {
        setProfile(data);
      } else {
        // Self-healing: auto-create the missing profile row
        const created = await autoCreateDoctorProfile(authUser);
        setProfile(created);
      }
    } else if (userRole === 'patient') {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      } else {
        // Self-healing: auto-create the missing profile row
        const created = await autoCreatePatientProfile(authUser);
        setProfile(created);
      }
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
