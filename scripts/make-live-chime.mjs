// Synthesises the Liora Live intro chime, so the sound is ours and can be rebuilt:
// node scripts/make-live-chime.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 44100;
const SECONDS = 1.4;
const n = Math.floor(RATE * SECONDS);
const out = new Float32Array(n);

// Two soft bell notes a fifth apart (E5 then B5), each a sine with a gentle octave overtone.
const notes = [
  { at: 0, hz: 659.25, gain: 0.5 },
  { at: 0.16, hz: 987.77, gain: 0.42 },
];
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
for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round((out[i] / peak) * 0.7 * 32767), i * 2);

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

mkdirSync('assets/sounds', { recursive: true });
writeFileSync('assets/sounds/live-in.wav', Buffer.concat([header, pcm]));
console.log(`assets/sounds/live-in.wav: ${SECONDS}s, ${((44 + pcm.length) / 1024).toFixed(0)} KB`);
