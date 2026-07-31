const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-4-26b-a4b-it:free';
const FALLBACK_MODEL = 'nvidia/nemotron-nano-9b-v2:free';

/**
 * Generate a smart 3-5 word medical topic title for a triage chat.
 * Uses the secondary OpenRouter API key provided for chat naming.
 *
 * @param {string} symptomText - Patient's raw symptom input
 * @returns {Promise<string>} Smart title e.g. "Acute High Fever & Cough"
 */
export async function generateChatTitle(symptomText) {
  if (!symptomText || typeof symptomText !== 'string') {
    return 'General Health Consultation';
  }

  const apiKey = import.meta.env.VITE_NAMING_OPENROUTER_KEY || import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return symptomText.slice(0, 40) + (symptomText.length > 40 ? '…' : '');
  }

  const systemPrompt = `You are a medical assistant assistant. Your job is to convert patient symptom descriptions into a short, concise 3-5 word medical topic title (Title Case).
Examples:
- Input: "I have severe headache since morning and feeling nauseous" -> "Severe Headache & Nausea"
- Input: "my stomach hurts a lot on right side after eating" -> "Abdominal Pain Assessment"
- Input: "fever with chills and body ache for 2 days" -> "High Fever & Body Aches"
- Input: "skin rash on arm that is itching" -> "Itching Skin Rash"

Respond with ONLY the 3-5 word title string. No quotes, no markdown, no punctuation at the end.`;

  try {
    const makeReq = (m) => fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'Doctorji - Chat Naming',
      },
      body: JSON.stringify({
        model: m,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: symptomText },
        ],
        temperature: 0.2,
        max_tokens: 30,
      }),
    });

    let res = await makeReq(MODEL);
    if (!res.ok) {
      res = await makeReq(FALLBACK_MODEL);
    }

    if (res.ok) {
      const data = await res.json();
      const rawTitle = data.choices?.[0]?.message?.content?.trim();
      if (rawTitle) {
        // Clean up quotes, brackets, markdown
        const cleaned = rawTitle.replace(/["'`#*]/g, '').trim();
        if (cleaned.length > 0 && cleaned.length < 80) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.warn('[generateChatTitle] Fallback to raw text snippet:', err.message);
  }

  // Fallback: raw truncated text
  return symptomText.slice(0, 40) + (symptomText.length > 40 ? '…' : '');
}
