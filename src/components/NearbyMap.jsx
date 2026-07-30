import { useEffect, useRef, useState } from 'react';
import { Phone, MapPin, Navigation, AlertTriangle, Locate } from 'lucide-react';

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

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([campusLat, campusLon], 11);
      mapRef.current = map;

      // Add zoom control to bottom-left
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      // Add attribution to bottom-right
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      // ── Premium dark tile layer ──
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(map);

      // ── Campus pin (animated glowing dot) ──
      const campusIcon = L.divIcon({
        className: '',
        html: `
          <div class="map-marker-campus">
            <div class="map-marker-campus__pulse"></div>
            <div class="map-marker-campus__dot"></div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const campusPopup = `
        <div class="map-popup-premium">
          <div class="map-popup-premium__badge">📍 YOUR LOCATION</div>
          <div class="map-popup-premium__name">VIT Bhopal University</div>
          <div class="map-popup-premium__sub">Academic Block 2, Kotri Kalan</div>
        </div>`;

      L.marker([campusLat, campusLon], { icon: campusIcon })
        .addTo(map)
        .bindPopup(campusPopup, { className: 'map-popup-container', closeButton: false, offset: [0, -5] })
        .openPopup();

      // ── Hospital markers ──
      HOSPITALS.forEach((h, i) => {
        const isOnCampus = i === 0;

        const markerHtml = isOnCampus
          ? `<div class="map-marker-hospital map-marker-hospital--campus">
               <div class="map-marker-hospital__pulse map-marker-hospital__pulse--teal"></div>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12M6 12h12"/></svg>
             </div>`
          : `<div class="map-marker-hospital">
               <div class="map-marker-hospital__pulse"></div>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12M6 12h12"/></svg>
             </div>`;

        const icon = L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const ratingHtml = h.rating
          ? `<div class="map-popup-premium__rating">
               <span class="map-popup-premium__stars">★ ${h.rating}</span>
               <span class="map-popup-premium__reviews">(${h.stars} reviews)</span>
             </div>`
          : '';

        const tagHtml = isOnCampus
          ? '<div class="map-popup-premium__badge map-popup-premium__badge--teal">🏥 ON CAMPUS</div>'
          : '';

        const popup = `
          <div class="map-popup-premium">
            ${tagHtml}
            <div class="map-popup-premium__name">${h.name}</div>
            <div class="map-popup-premium__sub">${h.subtitle}</div>
            ${ratingHtml}
            <div class="map-popup-premium__desc">${h.desc}</div>
            <div class="map-popup-premium__actions">
              <a href="${h.mapsUrl}" target="_blank" rel="noopener noreferrer" class="map-popup-premium__btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                View on Maps
              </a>
            </div>
          </div>`;

        L.marker([h.lat, h.lon], { icon }).addTo(map)
          .bindPopup(popup, { className: 'map-popup-container', closeButton: false, offset: [0, -5] });
      });

      // Draw faint connection lines from campus to hospitals
      HOSPITALS.forEach((h) => {
        L.polyline([[campusLat, campusLon], [h.lat, h.lon]], {
          color: '#14b8a6',
          weight: 1,
          opacity: 0.2,
          dashArray: '6, 8',
        }).addTo(map);
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
          <div className="map-loading__spinner">
            <div className="map-loading__ring"></div>
            <Locate size={20} />
          </div>
          <span>Locating nearby hospitals...</span>
        </div>
      )}

      {/* Glassmorphic header overlay */}
      <div className="map-header-overlay">
        <div className="map-header-overlay__icon">
          <MapPin size={14} />
        </div>
        <div className="map-header-overlay__text">
          <div className="map-header-overlay__title">Nearby Hospitals</div>
          <div className="map-header-overlay__sub">VIT Bhopal · {HOSPITALS.length} facilities</div>
        </div>
      </div>

      {/* Floating legend */}
      <div className="map-legend">
        <div className="map-legend__item">
          <span className="map-legend__dot map-legend__dot--blue"></span>
          <span>You</span>
        </div>
        <div className="map-legend__item">
          <span className="map-legend__dot map-legend__dot--teal"></span>
          <span>Campus</span>
        </div>
        <div className="map-legend__item">
          <span className="map-legend__dot map-legend__dot--red"></span>
          <span>Hospital</span>
        </div>
      </div>

      {/* SOS button */}
      <a href="tel:112" className="sos-btn" title="Call 112 Emergency">
        <AlertTriangle size={18} />
        <span>SOS</span>
      </a>

      <div ref={mapContainerRef} className="map-leaflet" />
    </div>
  );
}
