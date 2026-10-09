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
import { useState } from 'react';
import { gemmaSession } from './gemma-session';
import type { VoiceNote, VoiceNoteState } from './voice-note-types';

export type { VoiceNote, VoiceNoteState } from './voice-note-types';

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

export function useVoiceNote(): VoiceNote {
  const recorder = useAudioRecorder(WAV_16K);
  const status = useAudioRecorderState(recorder, 100);
  const [state, setState] = useState<VoiceNoteState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setState('error');
      setError('Microphone permission was not given');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState('recording');
  }

  async function stop() {
    if (state !== 'recording') return null;
    let uri: string | null = null;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      uri = recorder.uri;
      if (!uri) {
        setState('error');
        setError('Nothing was recorded');
        return null;
      }
      setState('transcribing');
      const gemma = await gemmaSession();
      const heard = await gemma.transcribe(uri);
      setState('idle');
      return heard.text ? heard : null;
    } catch (e) {
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

  // Metering is in dBFS; about -55 is a quiet room and -5 is close, clear speech.
  const level = state === 'recording' ? Math.min(1, Math.max(0, ((status.metering ?? -160) + 55) / 50)) : 0;

  return { state, seconds: Math.floor((status.durationMillis ?? 0) / 1000), level, error, start, stop, cancel };
}
