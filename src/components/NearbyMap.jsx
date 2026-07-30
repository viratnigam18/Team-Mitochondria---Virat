import { useEffect, useRef, useState } from 'react';
import { Phone, MapPin, Navigation, AlertTriangle } from 'lucide-react';

/**
 * NearbyMap — Leaflet map centered on user's geolocation.
 * Searches for hospitals nearby using OpenStreetMap Overpass API.
 * Calls onHospitalsFound(hospitals) when results are ready.
 */
export default function NearbyMap({ onHospitalsFound }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [nearestKm, setNearestKm] = useState(null);

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
      // VIT Bhopal University — AB2 (Academic Block 2)
      const defaultLat = 23.0742;
      const defaultLon = 76.8627;

      const initMap = (lat, lon) => {
        if (mapRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
          [lat, lon],
          14
        );
        mapRef.current = map;

        // OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // User / campus marker
        const userIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:16px;height:16px;border-radius:50%;
            background:#3b82f6;border:3px solid white;
            box-shadow:0 2px 8px rgba(59,130,246,.5);">
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([lat, lon], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>📍 VIT Bhopal — AB2</b><br><small>Academic Block 2</small>')
          .openPopup();

        // Campus boundary label
        const campusIcon = L.divIcon({
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
        L.marker([lat + 0.0008, lon], { icon: campusIcon, interactive: false }).addTo(map);

        // Search hospitals via Overpass API
        const radius = 8000; // 8km
        const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  node["healthcare"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
);
out center;`;

        fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: overpassQuery,
        })
          .then((r) => r.json())
          .then((data) => {
            const found = (data.elements || []).map((el) => {
              const hLat = el.lat || el.center?.lat;
              const hLon = el.lon || el.center?.lon;
              const dist = haversineKm(lat, lon, hLat, hLon);
              return {
                id: el.id,
                name: el.tags?.name || el.tags?.['name:en'] || 'Hospital / Clinic',
                lat: hLat,
                lon: hLon,
                phone: el.tags?.phone || el.tags?.contact_phone || null,
                dist: Math.round(dist * 10) / 10,
              };
            });

            found.sort((a, b) => a.dist - b.dist);
            const top = found.slice(0, 6);
            setHospitals(top);
            if (top[0]) setNearestKm(top[0].dist);
            if (onHospitalsFound) onHospitalsFound(top);

            // Hospital icon (red)
            const hospitalIcon = L.divIcon({
              className: '',
              html: `<div style="
                width:28px;height:28px;border-radius:50%;
                background:#ef4444;border:3px solid white;
                display:flex;align-items:center;justify-content:center;
                color:white;font-size:13px;font-weight:700;
                box-shadow:0 2px 8px rgba(239,68,68,.45);">H</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            top.forEach((h, i) => {
              if (!h.lat || !h.lon) return;
              const popup = `
                <div style="font-family:Inter,sans-serif;min-width:140px;">
                  ${i === 0 ? '<div style="color:#ef4444;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">NEAREST HOSPITAL</div>' : ''}
                  <div style="font-weight:700;font-size:.9rem;margin-bottom:2px;">${h.name}</div>
                  <div style="color:#64748b;font-size:.75rem;">Distance: ${h.dist} km</div>
                  ${h.phone ? `<a href="tel:${h.phone}" style="color:#14b8a6;font-size:.75rem;">📞 ${h.phone}</a>` : ''}
                </div>`;
              L.marker([h.lat, h.lon], { icon: hospitalIcon })
                .addTo(map)
                .bindPopup(popup);
            });

            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      };

      if (!navigator.geolocation) {
        initMap(defaultLat, defaultLon);
        setGeoError('Geolocation not supported — showing VIT Bhopal AB2.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
        () => {
          initMap(defaultLat, defaultLon);
          setGeoError('Location access denied — showing VIT Bhopal AB2.');
        },
        { timeout: 8000 }
      );
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-wrapper">
      {/* Loading overlay */}
      {loading && (
        <div className="map-loading">
          <div className="spinner" style={{ borderTopColor: '#14b8a6', borderColor: '#e2e8f0' }} />
          <span>Finding your location...</span>
        </div>
      )}

      {/* Geo error */}
      {geoError && (
        <div className="map-geo-error">
          <MapPin size={13} /> {geoError}
        </div>
      )}

      {/* Nearest indicator */}
      {nearestKm !== null && !loading && (
        <div className="map-nearest-badge">
          <Navigation size={12} /> Nearest: {nearestKm} km
        </div>
      )}

      {/* SOS button overlaid on map */}
      <a href="tel:112" className="sos-btn" title="Call 112 Emergency">
        <AlertTriangle size={18} />
        <span>SOS</span>
      </a>

      {/* Leaflet container */}
      <div ref={mapContainerRef} className="map-leaflet" />
    </div>
  );
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg) {
  return (deg * Math.PI) / 180;
}
