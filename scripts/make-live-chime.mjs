// Synthesises the Liora Live intro and outro chimes, so the sound is ours and can be rebuilt:
// node scripts/make-live-chime.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 44100;

// Soft bell notes: a sine with a gentle octave overtone, quick attack and a long fade.
function render(seconds, notes, level) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  for (const { at, hz, gain } of notes) {
    const start = Math.floor(at * RATE);
    for (let i = start; i < n; i++) {
      const t = (i - start) / RATE;
      const attack = Math.min(1, t / 0.012);
      const decay = Math.exp(-t * 3.2);
      const tone = Math.sin(2 * Math.PI * hz * t) + 0.18 * Math.sin(2 * Math.PI * hz * 2 * t) * Math.exp(-t * 6);
      out[i] += gain * attack * decay * tone;
    }
  }
  // A short fade at the end so it never clicks.
  const tail = Math.floor(0.08 * RATE);
  for (let i = 0; i < tail; i++) out[n - 1 - i] *= i / tail;
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round((out[i] / peak) * level * 32767), i * 2);
  return pcm;
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// In: E5 rising to B5. Out: the same fifth falling, softer and shorter, so leaving feels like closing.
const sounds = {
  'live-in.wav': render(1.4, [{ at: 0, hz: 659.25, gain: 0.5 }, { at: 0.16, hz: 987.77, gain: 0.42 }], 0.7),
  'live-out.wav': render(0.9, [{ at: 0, hz: 987.77, gain: 0.42 }, { at: 0.12, hz: 659.25, gain: 0.5 }], 0.55),
};

mkdirSync('assets/sounds', { recursive: true });
for (const [name, pcm] of Object.entries(sounds)) {
  const file = wav(pcm);
  writeFileSync(`assets/sounds/${name}`, file);
  console.log(`assets/sounds/${name}: ${(file.length / 1024).toFixed(0)} KB`);
}
