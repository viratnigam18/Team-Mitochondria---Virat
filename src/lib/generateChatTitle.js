const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Confirmed active free models on OpenRouter
const MODELS = [
  'openrouter/auto',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

/**
 * Generate a smart 3-5 word medical topic title for a triage chat.
 * Uses the secondary OpenRouter API key provided for chat naming.
 *
 * @param {string} symptomText - Patient's raw symptom input or diagnosis summary
 * @returns {Promise<string>} Smart title e.g. "Acute Nasal Bleeding"
 */
export async function generateChatTitle(symptomText) {
  if (!symptomText || typeof symptomText !== 'string') {
    return 'General Health Consultation';
  }

  const apiKey = import.meta.env.VITE_NAMING_OPENROUTER_KEY || import.meta.env.VITE_GROQ_API_KEY;

  const systemPrompt = `You are a medical triage assistant. Your job is to convert patient symptom descriptions into a clean, professional 3-5 word medical topic title (Title Case).

Examples:
- "i have blood coming out of my nose" -> "Acute Nasal Bleeding"
- "i have red ears and it burns" -> "Red & Inflamed Ears"
- "I have severe headache since morning" -> "Severe Headache & Nausea"
- "my stomach hurts a lot on right side" -> "Abdominal Pain Assessment"
- "fever with chills and body ache" -> "High Fever & Chills"
- "coughing badly for 3 days" -> "Persistent Cough Triage"

Respond with ONLY the 3-5 word title string. No quotes, no markdown, no explanation, no period at the end.`;

  if (apiKey) {
    for (const model of MODELS) {
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Title': 'Doctorji - Chat Naming',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Symptoms: "${symptomText}"` },
            ],
            temperature: 0.2,
            max_tokens: 35,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawTitle = data.choices?.[0]?.message?.content?.trim();
          if (rawTitle) {
            // Clean up quotes, markdown bold/code, periods
            const cleaned = rawTitle
              .replace(/["'`#*]/g, '')
              .replace(/^title:\s*/i, '')
              .replace(/\.$/, '')
              .trim();

            if (cleaned.length >= 3 && cleaned.length <= 60) {
              console.log(`[generateChatTitle] Generated title via ${model}: "${cleaned}"`);
              return cleaned;
            }
          }
        } else {
          console.warn(`[generateChatTitle] Model ${model} returned ${res.status}`);
        }
      } catch (err) {
        console.warn(`[generateChatTitle] Request error for ${model}:`, err.message);
      }
    }
  }

  // Fallback: Smart local formatter if API fails or unavailable
  return fallbackMedicalTitle(symptomText);
}

/**
 * Smart local fallback formatter that creates title-case medical summaries
 * without breaking if offline or API rate limited.
 */
function fallbackMedicalTitle(text) {
  let cleaned = text.trim().toLowerCase();

  // Common symptom mappings
  if (cleaned.includes('blood') && (cleaned.includes('nose') || cleaned.includes('nasal'))) {
    return 'Nasal Bleeding Symptom';
  }
  if (cleaned.includes('blood')) return 'Bleeding Symptom Triage';
  if (cleaned.includes('ear')) return 'Ear Pain & Inflammation';
  if (cleaned.includes('fever')) return 'Fever Assessment';
  if (cleaned.includes('headache') || cleaned.includes('head')) return 'Headache Assessment';
  if (cleaned.includes('stomach') || cleaned.includes('belly')) return 'Abdominal Discomfort';
  if (cleaned.includes('cough')) return 'Respiratory & Cough Check';
  if (cleaned.includes('chest')) return 'Chest Pain Assessment';
  if (cleaned.includes('eye')) return 'Eye Irritation Triage';

  // Capitalize first 4 words
  const words = text.trim().split(/\s+/).slice(0, 5);
  const titleCased = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return titleCased.length > 40 ? titleCased.slice(0, 40) + '…' : titleCased;
}
