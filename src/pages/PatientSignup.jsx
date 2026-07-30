import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { calculateAge } from '../lib/utils';
import {
  User, Mail, Lock, Eye, EyeOff, Phone, MapPin, Calendar,
  Droplets, AlertTriangle, Heart, ChevronRight, ChevronLeft, ShieldPlus
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    dob: '',
    mobile: '',
    email: '',
    password: '',
    location: '',
    prevHealthIssue: '',
    bloodGroup: '',
    allergies: '',
    emergencyContact: '',
  });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const nextStep = () => {
    setError('');
    setStep((s) => Math.min(s + 1, 2));
  };
  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  // Computed age from DOB
  const age = calculateAge(form.dob);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Check if this email is already registered as a doctor
    const { data: existingDoctor } = await supabase
      .from('doctors')
      .select('email')
      .eq('email', form.email)
      .maybeSingle();

    if (existingDoctor) {
      setError('This email is already registered as a Doctor. You cannot use the same email for both roles.');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'patient',
          full_name: form.fullName,
          mobile: form.mobile,
          dob: form.dob,
          age: age,
          location: form.location,
          blood_group: form.bloodGroup,
          allergies: form.allergies,
          prev_health_issue: form.prevHealthIssue,
          emergency_contact: form.emergencyContact,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Ensure we have an active session before inserting the profile row.
    // signUp() may not return a session when email confirmation is enabled.
    if (data?.user && !data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInErr) {
        setError('Account created but could not sign in: ' + signInErr.message);
        setLoading(false);
        return;
      }
    }

    // Insert patient profile with computed age
    if (data?.user) {
      const { error: insertErr } = await supabase.from('patients').upsert({
        id: data.user.id,
        full_name: form.fullName,
        dob: form.dob,
        age: age,
        mobile: form.mobile,
        email: form.email,
        location: form.location,
        prev_health_issue: form.prevHealthIssue,
        blood_group: form.bloodGroup,
        allergies: form.allergies,
        emergency_contact: form.emergencyContact,
      }, { onConflict: 'id' });
      if (insertErr) {
        console.error('Patient profile insert failed:', insertErr);
        setError('Account created but profile save failed: ' + insertErr.message);
        setLoading(false);
        return;
      }
    }

    navigate('/patient/dashboard');
  };

  return (
    <div className="auth-page">
      {/* Hero */}
      <div
        className="auth-page__hero"
        style={{
          background: 'linear-gradient(145deg, #78350f, #92400e 40%, #b45309)',
        }}
      >
        <div className="auth-page__hero-content fade-in">
          <div className="auth-page__hero-logo">
            ❤️ Doctor<span>ji</span>
          </div>
          <p className="auth-page__hero-tagline">
            Your health matters. Create an account to access AI-powered health
            triage and connect with verified doctors near you.
          </p>
          <div className="auth-page__hero-stats">
            <div className="auth-page__hero-stat">
              <strong>2 min</strong>
              <small>Quick Signup</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>100%</strong>
              <small>Private</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>Free</strong>
              <small>Always</small>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-page__form-side">
        <div className="auth-card slide-up">
          <div className="auth-card__header">
            <h1 className="auth-card__title">Patient Registration</h1>
            <p className="auth-card__subtitle">
              Step {step} of 2 —{' '}
              {step === 1 ? 'Personal Info' : 'Medical Info'}
            </p>
          </div>

          {/* Step dots */}
          <div className="step-indicator">
            {[1, 2].map((s) => (
              <span
                key={s}
                className={`step-dot ${
                  s === step
                    ? 'step-dot--active'
                    : s < step
                    ? 'step-dot--done'
                    : ''
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── Step 1: Personal ── */}
            {step === 1 && (
              <div className="form-grid form-grid--two-col">
                <div className="form-group form-group--full">
                  <label className="form-label">Full Name</label>
                  <div className="form-input-icon-wrap">
                    <User className="form-input-icon" />
                    <input
                      className="form-input"
                      name="fullName"
                      placeholder="Rahul Kumar"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Date of Birth
                    {age !== null && (
                      <span style={{
                        marginLeft: '.5rem',
                        padding: '.15rem .5rem',
                        background: '#fef3c7',
                        color: '#92400e',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '.7rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}>
                        Age: {age} yrs
                      </span>
                    )}
                  </label>
                  <div className="form-input-icon-wrap">
                    <Calendar className="form-input-icon" />
                    <input
                      className="form-input"
                      type="date"
                      name="dob"
                      value={form.dob}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile No.</label>
                  <div className="form-input-icon-wrap">
                    <Phone className="form-input-icon" />
                    <input
                      className="form-input"
                      type="tel"
                      name="mobile"
                      placeholder="+91 98765 43210"
                      value={form.mobile}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Email</label>
                  <div className="form-input-icon-wrap">
                    <Mail className="form-input-icon" />
                    <input
                      className="form-input"
                      type="email"
                      name="email"
                      placeholder="rahul@email.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Password</label>
                  <div className="form-input-icon-wrap">
                    <Lock className="form-input-icon" />
                    <input
                      className="form-input"
                      type={showPass ? 'text' : 'password'}
                      name="password"
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPass(!showPass)}
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label className="form-label">Location (Village / City)</label>
                  <div className="form-input-icon-wrap">
                    <MapPin className="form-input-icon" />
                    <input
                      className="form-input"
                      name="location"
                      placeholder="Mandawa, Rajasthan"
                      value={form.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group form-group--full" style={{ marginTop: '.5rem' }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--full"
                    onClick={nextStep}
                    style={{
                      background: 'linear-gradient(135deg, #b45309, #d97706)',
                      boxShadow: '0 2px 8px rgba(180,83,9,.3)',
                    }}
                  >
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Medical ── */}
            {step === 2 && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    name="bloodGroup"
                    value={form.bloodGroup}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Previous Health Issues</label>
                  <textarea
                    className="form-textarea"
                    name="prevHealthIssue"
                    placeholder="Diabetes, Hypertension, etc. (or None)"
                    value={form.prevHealthIssue}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Allergies</label>
                  <textarea
                    className="form-textarea"
                    name="allergies"
                    placeholder="Penicillin, Peanuts, etc. (or None)"
                    value={form.allergies}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact No.</label>
                  <div className="form-input-icon-wrap">
                    <Phone className="form-input-icon" />
                    <input
                      className="form-input"
                      type="tel"
                      name="emergencyContact"
                      placeholder="+91 98765 43210"
                      value={form.emergencyContact}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    marginTop: '.5rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={prevStep}
                    style={{ flex: 1 }}
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={loading}
                    style={{
                      flex: 2,
                      background: loading
                        ? undefined
                        : 'linear-gradient(135deg, #b45309, #d97706)',
                      boxShadow: '0 2px 8px rgba(180,83,9,.3)',
                    }}
                  >
                    {loading ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <ShieldPlus size={20} /> Create Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/patient/login">Sign in instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
