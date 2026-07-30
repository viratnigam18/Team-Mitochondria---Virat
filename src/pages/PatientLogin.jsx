import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff, Heart } from 'lucide-react';

export default function PatientLogin() {
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

    // Check that this user is actually a patient, not a doctor
    const role = data?.user?.user_metadata?.role;
    if (role && role !== 'patient') {
      await supabase.auth.signOut();
      setError('This account is registered as a Doctor. Please use the Doctor login page.');
      setLoading(false);
      return;
    }

    navigate('/patient/dashboard');
  };

  return (
    <div className="auth-page">
      {/* Hero */}
      <div className="auth-page__hero" style={{
        background: 'linear-gradient(145deg, #78350f, #92400e 40%, #b45309)',
      }}>
        <div className="auth-page__hero-content fade-in">
          <div className="auth-page__hero-logo">
            ❤️ Doctor<span>ji</span>
          </div>
          <p className="auth-page__hero-tagline">
            Access AI-powered health triage, share symptoms, and get connected
            with qualified doctors — right from your phone.
          </p>
          <div className="auth-page__hero-stats">
            <div className="auth-page__hero-stat">
              <strong>24/7</strong>
              <small>AI Triage</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>Free</strong>
              <small>Consultation</small>
            </div>
            <div className="auth-page__hero-stat">
              <strong>Secure</strong>
              <small>Data</small>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-page__form-side">
        <div className="auth-card slide-up">
          <div className="auth-card__header">
            <h1 className="auth-card__title">Welcome back</h1>
            <p className="auth-card__subtitle">
              Sign in to access your health dashboard
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
                    placeholder="patient@email.com"
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
                style={{
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
                    <Heart size={20} />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="auth-footer">
            New here?{' '}
            <Link to="/patient/signup">Create a patient account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
