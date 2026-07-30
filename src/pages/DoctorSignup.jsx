import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { calculateAge } from '../lib/utils';
import {
  User, Mail, Lock, Eye, EyeOff, Phone, MapPin, Calendar,
  GraduationCap, Award, Briefcase, Building2, Stethoscope, Link2, ChevronRight, ChevronLeft
} from 'lucide-react';

const SPECIALITIES = [
  'General Physician',
  'Pediatrics',
  'Gynecology / Obstetrics',
  'Orthopedics',
  'Dermatology',
  'ENT',
  'Ophthalmology',
  'Cardiology',
  'Neurology',
  'Psychiatry',
  'Dentistry',
  'Ayurveda / BAMS',
  'Homeopathy / BHMS',
  'Other',
];

export default function DoctorSignup() {
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
    degree: '',
    certification: '',
    drCardLink: '',
    speciality: '',
    experience: '',
    clinicName: '',
  });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const nextStep = () => {
    setError('');
    setStep((s) => Math.min(s + 1, 3));
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

    // 1. Check if this email is already registered as a patient
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('email')
      .eq('email', form.email)
      .maybeSingle();

    if (existingPatient) {
      setError('This email is already registered as a Patient. You cannot use the same email for both roles.');
      setLoading(false);
      return;
    }

    // 2. Create Supabase auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'doctor',
          full_name: form.fullName,
          mobile: form.mobile,
          dob: form.dob,
          age: age,
          location: form.location,
          degree: form.degree,
          certification: form.certification,
          dr_card_link: form.drCardLink,
          speciality: form.speciality,
          experience: form.experience,
          clinic_name: form.clinicName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 3. Insert doctor profile with computed age
    if (data?.user) {
      await supabase.from('doctors').insert({
        id: data.user.id,
        full_name: form.fullName,
        dob: form.dob,
        age: age,
        mobile: form.mobile,
        email: form.email,
        location: form.location,
        degree: form.degree,
        certification: form.certification,
        dr_card_link: form.drCardLink,
        speciality: form.speciality,
        experience: form.experience,
        clinic_name: form.clinicName,
      });
    }

    navigate('/doctor/dashboard');
  };

  return (
    <div className="auth-page">
      {/* Hero */}
      <div className="auth-page__hero">
        <div className="auth-page__hero-content fade-in">
          <div className="auth-page__hero-logo">
            🩺 Doctor<span>ji</span>
          </div>
          <p className="auth-page__hero-tagline">
            Register as a verified doctor and start helping patients in
            underserved communities today.
          </p>
          <div className="auth-page__hero-stats">
            <div className="auth-page__hero-stat">
              <strong>3 min</strong>
              <small>Quick Signup</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>Free</strong>
              <small>Forever</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>Verified</strong>
              <small>Profile</small>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-page__form-side">
        <div className="auth-card slide-up">
          <div className="auth-card__header">
            <h1 className="auth-card__title">Doctor Registration</h1>
            <p className="auth-card__subtitle">
              Step {step} of 3 —{' '}
              {step === 1
                ? 'Personal Info'
                : step === 2
                ? 'Credentials'
                : 'Practice Details'}
            </p>
          </div>

          {/* Step dots */}
          <div className="step-indicator">
            {[1, 2, 3].map((s) => (
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
                      placeholder="Dr. Anika Sharma"
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
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
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
                      placeholder="dr.sharma@clinic.in"
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
                  <label className="form-label">Location (City / Village)</label>
                  <div className="form-input-icon-wrap">
                    <MapPin className="form-input-icon" />
                    <input
                      className="form-input"
                      name="location"
                      placeholder="Jaipur, Rajasthan"
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
                  >
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Credentials ── */}
            {step === 2 && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Degree</label>
                  <div className="form-input-icon-wrap">
                    <GraduationCap className="form-input-icon" />
                    <input
                      className="form-input"
                      name="degree"
                      placeholder="MBBS, MD, BDS..."
                      value={form.degree}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Certification / Registration No.</label>
                  <div className="form-input-icon-wrap">
                    <Award className="form-input-icon" />
                    <input
                      className="form-input"
                      name="certification"
                      placeholder="MCI / State Med. Council Reg."
                      value={form.certification}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Doctor ID Card Link (for verification)
                  </label>
                  <div className="form-input-icon-wrap">
                    <Link2 className="form-input-icon" />
                    <input
                      className="form-input"
                      name="drCardLink"
                      placeholder="Google Drive / Imgur link"
                      value={form.drCardLink}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Speciality</label>
                  <select
                    className="form-select"
                    name="speciality"
                    value={form.speciality}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select speciality...</option>
                    {SPECIALITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
                    type="button"
                    className="btn btn--primary"
                    onClick={nextStep}
                    style={{ flex: 2 }}
                  >
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Practice ── */}
            {step === 3 && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <div className="form-input-icon-wrap">
                    <Briefcase className="form-input-icon" />
                    <input
                      className="form-input"
                      type="number"
                      name="experience"
                      placeholder="e.g. 5"
                      min="0"
                      value={form.experience}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Clinic / Hospital Name</label>
                  <div className="form-input-icon-wrap">
                    <Building2 className="form-input-icon" />
                    <input
                      className="form-input"
                      name="clinicName"
                      placeholder="Sharma Health Clinic"
                      value={form.clinicName}
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
                    style={{ flex: 2 }}
                  >
                    {loading ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <Stethoscope size={20} /> Create Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="auth-footer">
            Already registered?{' '}
            <Link to="/doctor/login">Sign in instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
