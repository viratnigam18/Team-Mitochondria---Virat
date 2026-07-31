import { useState } from 'react';
import { AlertTriangle, Send, X, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { sendWhatsAppSOS } from '../lib/sendWhatsAppSOS';

export default function SosModal({ isOpen, onClose, profile, defaultPhone }) {
  const [phone, setPhone] = useState(defaultPhone || profile?.emergency_contact || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please enter a valid emergency contact number.');
      return;
    }

    setLoading(true);
    try {
      await sendWhatsAppSOS({
        phone: phone.trim(),
        profile: profile || {},
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to open WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sos-modal-overlay">
      <div className="sos-modal">
        <button className="sos-modal__close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="sos-modal__header">
          <div className="sos-modal__icon">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="sos-modal__title">Emergency WhatsApp SOS</h2>
            <p className="sos-modal__sub">
              Share your live GPS location & medical info directly to WhatsApp
            </p>
          </div>
        </div>

        <form onSubmit={handleSend} className="sos-modal__body">
          {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={14} /> Emergency Contact Phone (WhatsApp)
            </label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. 9876543210 or +919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="sos-modal__preview">
            <div className="sos-modal__preview-title">
              <MapPin size={13} style={{ color: '#0d9488' }} /> Auto-Attached Details:
            </div>
            <ul className="sos-modal__preview-list">
              <li>📍 Live GPS Location (Google Maps link)</li>
              <li>👤 Patient: {profile?.full_name || 'Patient'}</li>
              {profile?.blood_group && <li>🩸 Blood Group: {profile.blood_group}</li>}
              {profile?.allergies && <li>⚠️ Allergies: {profile.allergies}</li>}
            </ul>
          </div>

          <button
            type="submit"
            className="btn btn--danger btn--full sos-modal__send-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner spinner--sm" />
            ) : (
              <>
                <Send size={18} /> SEND WHATSAPP SOS NOW
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
