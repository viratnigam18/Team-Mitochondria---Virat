const ASSEMBLYAI_API = 'https://api.assemblyai.com/v2';

/**
 * Upload an audio Blob to AssemblyAI, request transcription, and poll for the result.
 *
 * @param {Blob} audioBlob - The audio blob from MediaRecorder
 * @param {string} language - Language code: 'en' (English) or 'hi' (Hindi)
 * @returns {Promise<string>} The transcribed text
 */
export async function transcribeAudio(audioBlob, language = 'en') {
  const apiKey = import.meta.env.VITE_ASSEMBLYAI_KEY;

  if (!apiKey) {
    throw new Error('VITE_ASSEMBLYAI_KEY is not configured. Add it to your .env file.');
  }

  // Step 1: Upload audio to AssemblyAI
  const uploadRes = await fetch(`${ASSEMBLYAI_API}/upload`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBlob,
  });

  if (!uploadRes.ok) {
    throw new Error(`Audio upload failed (${uploadRes.status})`);
  }

  const { upload_url } = await uploadRes.json();

  // Step 2: Request transcription
  const transcriptRes = await fetch(`${ASSEMBLYAI_API}/transcript`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      language_code: language === 'hi' ? 'hi' : 'en',
    }),
  });

  if (!transcriptRes.ok) {
    throw new Error(`Transcription request failed (${transcriptRes.status})`);
  }

  const { id: transcriptId } = await transcriptRes.json();

  // Step 3: Poll for result (max ~60 seconds)
  const MAX_POLLS = 30;
  const POLL_INTERVAL = 2000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    const pollRes = await fetch(`${ASSEMBLYAI_API}/transcript/${transcriptId}`, {
      headers: { Authorization: apiKey },
    });

    if (!pollRes.ok) {
      throw new Error(`Polling failed (${pollRes.status})`);
    }

    const result = await pollRes.json();

    if (result.status === 'completed') {
      return result.text || '';
    }

    if (result.status === 'error') {
      throw new Error(result.error || 'Transcription failed');
    }

    // status is 'queued' or 'processing' — continue polling
  }

  throw new Error('Transcription timed out. Please try again with a shorter recording.');
}
