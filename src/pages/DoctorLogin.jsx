import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff, Stethoscope } from 'lucide-react';

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check that this user is actually a doctor, not a patient
    const role = data?.user?.user_metadata?.role;
    if (role && role !== 'doctor') {
      await supabase.auth.signOut();
      setError('This account is registered as a Patient. Please use the Patient login page.');
      setLoading(false);
      return;
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
            Join a network of verified doctors making healthcare accessible in
            every village across India.
          </p>
          <div className="auth-page__hero-stats">
            <div className="auth-page__hero-stat">
              <strong>2,500+</strong>
              <small>Doctors</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>18</strong>
              <small>States</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>50K+</strong>
              <small>Patients Helped</small>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-page__form-side">
        <div className="auth-card slide-up">
          <div className="auth-card__header">
            <h1 className="auth-card__title">Welcome back, Doctor</h1>
            <p className="auth-card__subtitle">
              Sign in to your clinic dashboard
            </p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-icon-wrap">
                  <Lock className="form-input-icon" />
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
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

              <button
                type="submit"
                className="btn btn--primary btn--full btn--lg"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : <>
                  <Stethoscope size={20} />
                  Sign In
                </>}
              </button>
            </div>
          </form>

          <p className="auth-footer">
            New to Doctorji?{' '}
            <Link to="/doctor/signup">Create your doctor account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
