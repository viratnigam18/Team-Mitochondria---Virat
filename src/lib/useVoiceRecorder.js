import { useState, useRef, useCallback } from 'react';

/**
 * Custom React hook for in-browser audio recording via MediaRecorder API.
 *
 * Returns:
 *   isRecording  — boolean
 *   audioBlob    — Blob | null (the last recorded audio)
 *   startRecording()
 *   stopRecording() → Promise<Blob>
 *   error        — string | null
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError('Could not start recording: ' + err.message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        setIsRecording(false);

        // Stop all tracks to release the mic
        recorder.stream.getTracks().forEach((t) => t.stop());

        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  return { isRecording, audioBlob, startRecording, stopRecording, error };
}
