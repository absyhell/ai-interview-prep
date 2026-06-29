/**
 * Voice recording + Whisper STT hook + browser TTS helper.
 * Returns: { recording, start, stop, transcribing }
 */
import { useRef, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

export function useVoiceRecorder({ onTranscript }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (blob.size < 1000) {
          toast.error("Recording too short");
          return;
        }
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, "answer.webm");
          const res = await api.post("/voice/transcribe", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 90000,
          });
          if (res.data?.text) {
            onTranscript(res.data.text);
            toast.success("Transcribed");
          } else {
            toast.error("Couldn't understand audio");
          }
        } catch (err) {
          toast.error(err?.response?.data?.detail || "Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      toast.error("Microphone permission denied");
    }
  };

  const stop = () => {
    try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
  };

  return { recording, transcribing, start, stop };
}

// ---------- Browser TTS ----------
let currentUtterance = null;
export function speak(text) {
  if (!("speechSynthesis" in window)) return false;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.0;
  u.volume = 1.0;
  // Prefer a natural English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /en[-_]US/i.test(v.lang) && /Google|Samantha|Natural/.test(v.name))
    || voices.find((v) => /en/i.test(v.lang));
  if (preferred) u.voice = preferred;
  currentUtterance = u;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking() {
  return "speechSynthesis" in window && window.speechSynthesis.speaking;
}
