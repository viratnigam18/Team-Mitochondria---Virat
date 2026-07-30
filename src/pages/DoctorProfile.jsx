import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { Stethoscope, Save, Loader } from 'lucide-react';

export default function DoctorProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: '', dob: '', mobile: '', location: '',
    degree: '', certification: '', dr_card_link: '',
    speciality: '', experience: '', clinic_name: '',
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
        degree: profile.degree || '',
        certification: profile.certification || '',
        dr_card_link: profile.dr_card_link || '',
        speciality: profile.speciality || '',
        experience: profile.experience?.toString() || '',
        clinic_name: profile.clinic_name || '',
      });
    }
  }, [profile]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const { error: err } = await supabase.from('doctors').update({
      ...form,
      experience: form.experience ? parseInt(form.experience) : null,
    }).eq('id', user.id);
    if (err) setError(err.message);
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); await refreshProfile(); }
    setSaving(false);
  };

  const SPECIALITIES = [
    'General Physician', 'Pediatrics', 'Gynecology', 'Cardiology',
    'Orthopedics', 'Dermatology', 'ENT', 'Ophthalmology',
    'Neurology', 'Psychiatry', 'Dentistry', 'Ayurveda', 'Homeopathy',
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Doctor Profile</h1>
            <p className="page-subtitle">Keep your credentials and information updated</p>
          </div>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert--success" style={{ marginBottom: '1rem' }}>✅ Profile updated!</div>}

        <div className="profile-card">
          <div className="profile-avatar profile-avatar--doctor">
            <Stethoscope size={40} />
            <div className="profile-avatar__role">DOCTOR</div>
          </div>

          <div className="profile-form">
            <h3 className="profile-section-title">Personal Information</h3>
            <div className="form-grid form-grid--two-col">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Dr. Full Name" />
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
                <label className="form-label">Location / City</label>
                <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="City or district" />
              </div>
            </div>

            <h3 className="profile-section-title" style={{ marginTop: '1.5rem' }}>Professional Details</h3>
            <div className="form-grid form-grid--two-col">
              <div className="form-group">
                <label className="form-label">Degree</label>
                <input className="form-input" name="degree" value={form.degree} onChange={handleChange} placeholder="MBBS, BDS, BAMS..." />
              </div>
              <div className="form-group">
                <label className="form-label">Speciality</label>
                <select className="form-select" name="speciality" value={form.speciality} onChange={handleChange}>
                  <option value="">Select speciality</option>
                  {SPECIALITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Clinic / Hospital Name</label>
                <input className="form-input" name="clinic_name" value={form.clinic_name} onChange={handleChange} placeholder="Your clinic name" />
              </div>
              <div className="form-group">
                <label className="form-label">Years of Experience</label>
                <input className="form-input" type="number" min="0" name="experience" value={form.experience} onChange={handleChange} placeholder="e.g. 5" />
              </div>
              <div className="form-group">
                <label className="form-label">Certification / License No.</label>
                <input className="form-input" name="certification" value={form.certification} onChange={handleChange} placeholder="MCI Reg. No." />
              </div>
              <div className="form-group">
                <label className="form-label">Certificate / ID Card Link</label>
                <input className="form-input" name="dr_card_link" value={form.dr_card_link} onChange={handleChange} placeholder="Google Drive / Dropbox link" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
