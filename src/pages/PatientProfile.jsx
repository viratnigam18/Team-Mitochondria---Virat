import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { User, Save, Loader } from 'lucide-react';

export default function PatientProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: '', dob: '', mobile: '', location: '',
    blood_group: '', allergies: '', prev_health_issue: '', emergency_contact: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        dob: profile.dob || '',
        mobile: profile.mobile || '',
        location: profile.location || '',
        blood_group: profile.blood_group || '',
        allergies: profile.allergies || '',
        prev_health_issue: profile.prev_health_issue || '',
        emergency_contact: profile.emergency_contact || '',
      });
    }
  }, [profile]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const { error: err } = await supabase.from('patients').upsert({
      id: user.id,
      email: user.email,
      ...form,
    }, { onConflict: 'id' });
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await refreshProfile();
    }
    setSaving(false);
  };

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Keep your health information up to date</p>
          </div>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert--success" style={{ marginBottom: '1rem' }}>✅ Profile updated successfully!</div>}

        <div className="profile-card">
          {/* Avatar */}
          <div className="profile-avatar">
            <User size={40} />
            <div className="profile-avatar__role">PATIENT</div>
          </div>

          {/* Form */}
          <div className="profile-form">
            <h3 className="profile-section-title">Personal Information</h3>
            <div className="form-grid form-grid--two-col">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Account)</label>
                <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" type="date" name="dob" value={form.dob} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input className="form-input" name="mobile" value={form.mobile} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Location / Village</label>
                <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="Your village or city" />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" name="blood_group" value={form.blood_group} onChange={handleChange}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input className="form-input" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} placeholder="Emergency contact number" />
              </div>
            </div>

            <h3 className="profile-section-title" style={{ marginTop: '1.5rem' }}>Medical Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Known Allergies</label>
                <textarea className="form-textarea" name="allergies" value={form.allergies} onChange={handleChange} placeholder="e.g. Penicillin, Peanuts..." rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Previous Health Issues</label>
                <textarea className="form-textarea" name="prev_health_issue" value={form.prev_health_issue} onChange={handleChange} placeholder="e.g. Diabetes, Hypertension..." rows={2} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
