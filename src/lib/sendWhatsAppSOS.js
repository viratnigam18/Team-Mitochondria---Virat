/**
 * Formats a phone number for WhatsApp deep link.
 * Prepend country code '91' (India) if 10 digits and no country code provided.
 *
 * @param {string} rawPhone
 * @returns {string} Cleaned phone number string
 */
export function formatWhatsAppPhone(rawPhone) {
  if (!rawPhone) return '';
  // Strip non-digits except initial +
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 10) {
    // Default to India country code 91 if 10-digit number
    cleaned = '91' + cleaned;
  }

  return cleaned;
}

/**
 * Gets current browser GPS location with a timeout fallback.
 *
 * @returns {Promise<{ lat: number, lon: number, mapsUrl: string, accuracyText: string }>}
 */
export function getGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        lat: 23.0774,
        lon: 76.8627,
        mapsUrl: 'https://maps.google.com/?q=23.0774,76.8627',
        accuracyText: 'VIT Bhopal Campus (Default)',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);
        resolve({
          lat,
          lon,
          mapsUrl: `https://maps.google.com/?q=${lat},${lon}`,
          accuracyText: `GPS Coordinates (${lat}, ${lon})`,
        });
      },
      (err) => {
        console.warn('[getGPSLocation] Geolocation error:', err.message);
        resolve({
          lat: 23.0774,
          lon: 76.8627,
          mapsUrl: 'https://maps.google.com/?q=23.0774,76.8627',
          accuracyText: 'VIT Bhopal Campus (Location Access Required)',
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

/**
 * Trigger an Emergency SOS via WhatsApp link.
 *
 * @param {object} params
 * @param {string} params.phone - Emergency contact phone number
 * @param {object} params.profile - Patient profile object (full_name, age, blood_group, allergies)
 * @param {string} [params.customMessage] - Optional custom message prefix
 * @returns {Promise<boolean>} True if WhatsApp window was opened
 */
export async function sendWhatsAppSOS({ phone, profile = {}, customMessage }) {
  const formattedPhone = formatWhatsAppPhone(phone);
  if (!formattedPhone) {
    throw new Error('Please enter a valid emergency contact phone number.');
  }

  // Get current location
  const loc = await getGPSLocation();

  const patientName = profile.full_name || 'Patient';
  const ageStr = profile.age ? `${profile.age} yrs` : 'N/A';
  const bloodStr = profile.blood_group || 'Not specified';
  const allergyStr = profile.allergies || 'None reported';

  const messageText = `🚨 EMERGENCY SOS - NEED IMMEDIATE MEDICAL HELP! 🚨

Patient: ${patientName}
Age: ${ageStr} | Blood Group: ${bloodStr}
Allergies: ${allergyStr}
${customMessage ? `\nNote: ${customMessage}\n` : ''}
📍 Current Live Location:
${loc.mapsUrl}

Sent via Doctorji Medical SOS. Please respond or call immediately!`;

  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return true;
}
