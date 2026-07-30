import { useEffect, useRef, useState } from 'react';
import { Phone, MapPin, Navigation, AlertTriangle } from 'lucide-react';

// ── Hardcoded hospitals near VIT Bhopal ──────────────────────────
const HOSPITALS = [
  {
    id: 1,
    name: 'Dr. Morepen Health Centre',
    subtitle: 'VIT Bhopal University — On Campus',
    lat: 23.0742,
    lon: 76.8627,
    phone: null,
    dist: 0.1,
    rating: null,
    tag: 'ON CAMPUS',
    tagColor: '#14b8a6',
    desc: 'Primary on-campus medical facility. Provides immediate care, diagnostics, and pharmacy services.',
    mapsUrl: 'https://maps.google.com/?q=VIT+Bhopal+University',
  },
  {
    id: 2,
    name: 'Saniya Hospital',
    subtitle: 'Ashta, Bahadarpura, Madhya Pradesh',
    lat: 23.0168,
    lon: 76.7173,
    phone: null,
    dist: 18.2,
    rating: '4.6',
    stars: 30,
    desc: 'Located on Indore-Bhopal Bypass Road in Ashta. 24/7 critical illness monitoring, general surgery, and ICU facilities.',
    mapsUrl: 'https://maps.google.com/?q=Saniya+Hospital+Ashta',
  },
  {
    id: 3,
    name: 'J.K. Hospital Ashta',
    subtitle: 'Multi Specialty and Trauma Center, Ashta',
    lat: 23.0200,
    lon: 76.7250,
    phone: null,
    dist: 19.1,
    rating: '3.6',
    stars: 14,
    desc: 'Located on the Old Indore-Bhopal Road. Round-the-clock emergency support, X-ray infrastructure, and patient transport services.',
    mapsUrl: 'https://maps.google.com/?q=JK+Hospital+Ashta+Multi+Specialty',
  },
  {
    id: 4,
    name: 'New Rudra Hospital',
    subtitle: 'Sehore, Barkhedi, Madhya Pradesh',
    lat: 23.2020,
    lon: 77.0867,
    phone: null,
    dist: 24.7,
    rating: '4.8',
    stars: 48,
    desc: 'Well-equipped hospital in Sehore. General medicine, surgery, and emergency care services available.',
    mapsUrl: 'https://maps.google.com/?q=New+Rudra+Hospital+Sehore',
  },
];

export default function NearbyMap({ onHospitalsFound }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      const campusLat = 23.0742;
      const campusLon = 76.8627;

      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
        [campusLat, campusLon],
        13
      );
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // ── Campus pin (blue dot) ─────────────────────────────────
      const campusIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#3b82f6;border:3px solid white;
          box-shadow:0 2px 8px rgba(59,130,246,.5);">
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([campusLat, campusLon], { icon: campusIcon })
        .addTo(map)
        .bindPopup('<b>📍 VIT Bhopal — AB2</b><br><small>Academic Block 2</small>')
        .openPopup();

      // Campus label
      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="
          background:rgba(13,148,136,.9);color:white;
          font-size:10px;font-weight:700;padding:3px 7px;
          border-radius:4px;white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,.2);">
          🏫 VIT Bhopal AB2
        </div>`,
        iconSize: [120, 22],
        iconAnchor: [60, 28],
      });
      L.marker([campusLat + 0.0009, campusLon], { icon: labelIcon, interactive: false }).addTo(map);

      // ── Hospital markers ──────────────────────────────────────
      HOSPITALS.forEach((h, i) => {
        const isOnCampus = i === 0;
        const markerHtml = isOnCampus
          ? `<div style="
              width:30px;height:30px;border-radius:50%;
              background:linear-gradient(135deg,#0d9488,#14b8a6);
              border:3px solid white;
              display:flex;align-items:center;justify-content:center;
              color:white;font-size:13px;font-weight:700;
              box-shadow:0 2px 8px rgba(13,148,136,.5);">+</div>`
          : `<div style="
              width:28px;height:28px;border-radius:50%;
              background:#ef4444;border:3px solid white;
              display:flex;align-items:center;justify-content:center;
              color:white;font-size:12px;font-weight:700;
              box-shadow:0 2px 8px rgba(239,68,68,.45);">H</div>`;

        const icon = L.divIcon({ className: '', html: markerHtml, iconSize: [30, 30], iconAnchor: [15, 15] });

        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:160px;">
            ${isOnCampus ? '<div style="color:#0d9488;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">🏥 ON CAMPUS</div>' : ''}
            <div style="font-weight:700;font-size:.85rem;margin-bottom:2px;">${h.name}</div>
            <div style="color:#64748b;font-size:.72rem;">${h.subtitle}</div>
            ${h.rating ? `<div style="color:#f59e0b;font-size:.72rem;margin-top:2px;">★ ${h.rating} (${h.stars} reviews)</div>` : ''}
            <div style="color:#475569;font-size:.7rem;margin-top:4px;line-height:1.4;">${h.desc}</div>
            <a href="${h.mapsUrl}" target="_blank" style="color:#14b8a6;font-size:.72rem;margin-top:4px;display:block;">📍 View on Maps</a>
          </div>`;

        L.marker([h.lat, h.lon], { icon }).addTo(map).bindPopup(popup);
      });

      // Pass hardcoded hospitals to parent immediately
      if (onHospitalsFound) onHospitalsFound(HOSPITALS);
      setLoading(false);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div className="map-wrapper">
      {loading && (
        <div className="map-loading">
          <div className="spinner" style={{ borderTopColor: '#14b8a6', borderColor: '#e2e8f0' }} />
          <span>Loading map...</span>
        </div>
      )}

      {/* SOS button */}
      <a href="tel:112" className="sos-btn" title="Call 112 Emergency">
        <AlertTriangle size={18} />
        <span>SOS</span>
      </a>

      <div ref={mapContainerRef} className="map-leaflet" />
    </div>
  );
}
