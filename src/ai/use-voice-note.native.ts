import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { createVad } from '../core/agent';
import { gemmaSession } from './gemma-session';
import { heardWords, MIN_CLIP_MS } from './transcript';
import { MIC_DENIED, type VoiceNote, type VoiceNoteOptions, type VoiceNoteState } from './voice-note-types';

export { MIC_DENIED, type VoiceNote, type VoiceNoteOptions, type VoiceNoteState } from './voice-note-types';

// 16 kHz mono 16-bit WAV: what Gemma 4's audio encoder reads; llama.cpp cannot decode AAC.
const WAV_16K: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  isMeteringEnabled: true,
  android: { outputFormat: 'default', audioEncoder: 'default' },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const AUTO_LIMIT_S = 30;

const MIN_TURN_MS = 700;

export function useVoiceNote({ autoStop = false, onHeard }: VoiceNoteOptions = {}): VoiceNote {
  const recorder = useAudioRecorder(WAV_16K);
  const status = useAudioRecorderState(recorder, 100);
  const [state, setState] = useState<VoiceNoteState>('idle');
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const vad = useRef(createVad());
  const autoStopping = useRef(false);
  const stopLatest = useRef<() => Promise<{ text: string; ms: number } | null>>(() => Promise.resolve(null));
  const heardLatest = useRef(onHeard);
  heardLatest.current = onHeard;

  async function start() {
    setError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setState('error');
      setError(MIC_DENIED);
      throw new Error(MIC_DENIED);
    }
    vad.current.reset();
    autoStopping.current = false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setState('recording');
  }

  async function stop() {
    if (state !== 'recording') {
      if (__DEV__) console.warn(`[voice] stop() while ${state}`);
      return null;
    }
    let uri: string | null = null;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      uri = recorder.uri;
      if (!uri) {
        if (__DEV__) console.warn('[voice] nothing was recorded');
        setState('error');
        setError('Nothing was recorded');
        return null;
      }
      setState('transcribing');
      const size = new File(uri).size ?? 0;
      const clipMs = Date.now() - startedAt.current;
      if (__DEV__) console.log(`[voice] recorded ${clipMs} ms of wall time into ${size} bytes`);
      // A clip too short to hold words is not sent to Gemma, which would answer about the audio.
      if (clipMs < MIN_CLIP_MS) {
        setState('idle');
        return null;
      }
      const gemma = await gemmaSession();
      const heard = await gemma.transcribe(uri);
      if (__DEV__) console.log(`[voice] ${size} bytes, ${heard.ms} ms, heard: ${JSON.stringify(heard.text)}`);
      setState('idle');
      const words = heardWords(heard.text, clipMs);
      return words ? { ...heard, text: words } : null;
    } catch (e) {
      if (__DEV__) console.warn(`[voice] failed: ${message(e)}`);
      setState('error');
      setError(message(e));
      return null;
    } finally {
      // Her voice is not kept, even when recording or transcription fails.
      const left = uri ?? recorder.uri;
      if (left) {
        try {
          new File(left).delete();
        } catch {}
      }
    }
  }

  async function cancel() {
    if (state !== 'recording') return;
    const left = recorder.uri;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {}
    setState('idle');
    if (left) {
      try {
        new File(left).delete();
      } catch {}
    }
  }

  stopLatest.current = stop;

  // Hands-free: the recorder's loudness decides when she has finished speaking.
  useEffect(() => {
    if (!autoStop || state !== 'recording' || autoStopping.current) return;
    // Time each turn from its own start: the recorder's status can still hold the last turn's
    // duration for a moment, which once ended a new turn the instant it began.
    const elapsed = Date.now() - startedAt.current;
    if (elapsed < MIN_TURN_MS) return;
    const verdict = vad.current.push(status.metering ?? -160, elapsed);
    if (verdict !== 'end' && elapsed / 1000 < AUTO_LIMIT_S) return;
    autoStopping.current = true;
    void stopLatest.current().then((heard) => heardLatest.current?.(heard));
  }, [autoStop, state, status.metering, status.durationMillis]);

  // Metering is in dBFS; about -55 is a quiet room and -5 is close, clear speech.
  const level = state === 'recording' ? Math.min(1, Math.max(0, ((status.metering ?? -160) + 55) / 50)) : 0;

  return { state, seconds: Math.floor((status.durationMillis ?? 0) / 1000), level, error, start, stop, cancel };
}
