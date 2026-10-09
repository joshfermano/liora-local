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
  const status = useAudioRecorderState(recorder, 250);
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
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = recorder.uri;
    if (!uri) {
      setState('error');
      setError('Nothing was recorded');
      return null;
    }
    setState('transcribing');
    try {
      const gemma = await gemmaSession();
      const heard = await gemma.transcribe(uri);
      setState('idle');
      return heard.text ? heard : null;
    } catch (e) {
      setState('error');
      setError(message(e));
      return null;
    } finally {
      // Her voice is not kept; only the words she confirms are saved.
      try {
        new File(uri).delete();
      } catch {}
    }
  }

  return { state, seconds: Math.floor((status.durationMillis ?? 0) / 1000), error, start, stop };
}
