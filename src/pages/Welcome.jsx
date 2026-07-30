import { Link } from 'react-router-dom';
import { Stethoscope, Heart } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="welcome-page">
      <div className="welcome-content slide-up">
        <div className="welcome-badge">
          <span className="welcome-badge__dot" />
          AI-Powered Rural Health Triage
        </div>

        <h1 className="welcome-title">
          Doctor<span>ji</span>
        </h1>

        <p className="welcome-subtitle">
          Bridging the healthcare gap in rural India. Get instant AI-powered
          health triage, connect with verified doctors, and manage your
          health — all in one place.
        </p>

        <div className="welcome-cards">
          <Link to="/doctor/login" className="welcome-card welcome-card--doctor">
            <div className="welcome-card__icon">
              <Stethoscope size={28} color="white" />
            </div>
            <div className="welcome-card__label">I'm a Doctor</div>
            <div className="welcome-card__desc">Manage patients & appointments</div>
          </Link>

          <Link to="/patient/login" className="welcome-card welcome-card--patient">
            <div className="welcome-card__icon">
              <Heart size={28} color="white" />
            </div>
            <div className="welcome-card__label">I'm a Patient</div>
            <div className="welcome-card__desc">Get health guidance & triage</div>
          </Link>
        </div>

        <p className="welcome-footer">
          Built with ❤️ by Team Mitochondria — GSoC 2026
        </p>
      </div>
    </div>
  );
}
