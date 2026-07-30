import { supabase } from './supabaseClient';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Confirmed live free models on OpenRouter (verified 2026-07-30)
// Gemma 4 26B is MoE — only ~4B params active, so it's fast + free
const MODEL = 'google/gemma-4-26b-a4b-it:free';
const FALLBACK_MODEL = 'nvidia/nemotron-nano-9b-v2:free';

const SYSTEM_PROMPT = `You are Doctorji, an AI health triage assistant for rural India. You help patients understand their symptoms and provide preliminary guidance.

IMPORTANT RULES:
1. You are NOT a replacement for a real doctor. Always advise seeing a doctor for serious symptoms.
2. Be culturally sensitive to rural Indian context.
3. If the symptom description is too vague or you need more information to assess properly, set follow_up_question to a short clarifying question. Otherwise set it to null.
4. Classify severity as:
   - "green": Minor issue, can likely be managed at home
   - "medium": Should see a doctor within 1-2 days  
   - "red": URGENT — needs immediate medical attention / emergency

You MUST respond with ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "severity": "green",
  "home_remedy": "Simple home remedy advice",
  "medicine": "Over-the-counter medicine suggestion (with disclaimer)",
  "cause_guess": "Most likely cause of symptoms",
  "future_risk": "What could happen if untreated",
  "food_advice": "What to eat and drink",
  "avoid_list": "What to avoid (food, activities)",
  "follow_up_question": null
}`;

/**
 * Internal helper — makes a single fetch to OpenRouter.
 */
async function callOpenRouter(apiKey, model, userMessage) {
  return fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Doctorji - AI Health Triage',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });
}

/**
 * Analyze symptoms using OpenRouter (Llama 3.1 8B → Mistral 7B fallback).
 *
 * @param {string} symptomText - The patient's symptom description
 * @param {object} patientContext - { age, allergies, prevHealthIssue, fullName }
 * @param {string} userId - The patient's auth user ID
 * @returns {object} The parsed AI result
 */
export async function analyzeSymptom(symptomText, patientContext = {}, userId) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_GROQ_API_KEY is not configured. Add it to your .env file.');
  }

  const { age, allergies, prevHealthIssue } = patientContext;

  const userMessage = `Patient Info:
- Age: ${age || 'Unknown'}
- Known Allergies: ${allergies || 'None reported'}
- Previous Health Issues: ${prevHealthIssue || 'None reported'}

Current Symptoms:
${symptomText}

Analyze these symptoms and respond with the JSON format specified.`;

  // Try primary model; if 400/404, auto-fallback to secondary
  let response = await callOpenRouter(apiKey, MODEL, userMessage);

  if (!response.ok && (response.status === 400 || response.status === 404 || response.status === 429)) {
    console.warn(`Primary model failed (${response.status}), trying fallback: ${FALLBACK_MODEL}`);
    response = await callOpenRouter(apiKey, FALLBACK_MODEL, userMessage);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter full error:', errorBody);
    let friendlyMsg = `AI service error (${response.status}).`;
    try {
      const errJson = JSON.parse(errorBody);
      friendlyMsg = errJson?.error?.message || friendlyMsg;
    } catch { /* non-JSON error body */ }
    throw new Error(friendlyMsg + ' Please try again.');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from AI model. Please try again.');
  }

  // Parse JSON — handle both raw JSON and markdown-wrapped ```json blocks
  let parsed;
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse AI response:', content);
    // Use a safe fallback so the UI doesn't break
    parsed = {
      severity: 'medium',
      home_remedy: 'Please consult a doctor for proper diagnosis.',
      medicine: 'Cannot determine without proper assessment.',
      cause_guess: 'AI response could not be parsed. Please re-describe your symptoms.',
      future_risk: 'Please see a doctor for proper assessment.',
      food_advice: 'Maintain a balanced diet and stay hydrated.',
      avoid_list: 'Avoid self-medication.',
      follow_up_question: null,
    };
  }

  // Sanitize severity — AI may return "Green", "Medium ", "RED" etc.
  // DB CHECK constraint requires exactly: 'green', 'medium', 'red'
  const VALID_SEVERITIES = ['green', 'medium', 'red'];
  if (parsed.severity) {
    parsed.severity = parsed.severity.toLowerCase().trim();
    if (!VALID_SEVERITIES.includes(parsed.severity)) {
      console.warn(`Invalid severity "${parsed.severity}", defaulting to "medium"`);
      parsed.severity = 'medium';
    }
  } else {
    parsed.severity = 'medium';
  }

  // If AI needs more info, return follow-up question without saving
  if (parsed.follow_up_question) {
    return { ...parsed, saved: false };
  }

  // Save completed analysis to checkups table
  if (userId) {
    const checkupPayload = {
      patient_id: userId,
      symptom_text: symptomText,
      severity: parsed.severity,
      ai_advice: parsed.cause_guess,
      home_remedy: parsed.home_remedy,
      medicine: parsed.medicine,
      food_advice: parsed.food_advice,
      cause_guess: parsed.cause_guess,
      future_risk: parsed.future_risk,
      avoid_list: parsed.avoid_list,
    };

    let { error: dbError } = await supabase.from('checkups').insert(checkupPayload);

    // If foreign key constraint failed because patient row doesn't exist yet, self-heal
    if (dbError && dbError.message?.includes('foreign key constraint')) {
      console.warn('Patient row missing for checkups insert. Creating patient profile first...');
      const { data: authUserData } = await supabase.auth.getUser();
      if (authUserData?.user) {
        await supabase.from('patients').upsert({
          id: userId,
          full_name: authUserData.user.user_metadata?.full_name || 'Patient',
          email: authUserData.user.email,
        }, { onConflict: 'id' });

        // Retry insert
        const retry = await supabase.from('checkups').insert(checkupPayload);
        dbError = retry.error;
      }
    }

    if (dbError) {
      console.error('Failed to save checkup to DB:', dbError.message);
    } else {
      console.log('Checkup successfully saved to patient history!');
    }
  }

  return { ...parsed, saved: true };
}
