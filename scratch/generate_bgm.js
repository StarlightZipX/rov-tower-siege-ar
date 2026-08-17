import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_RATE = 44100;
const BPM = 118;
const BEAT_DURATION = 60 / BPM;
const TOTAL_BEATS = 32; // 8 bars of 4/4
const DURATION = TOTAL_BEATS * BEAT_DURATION;
const NUM_SAMPLES = Math.floor(DURATION * SAMPLE_RATE);

function createWavHeader(numChannels, sampleRate, bitsPerSample, numSamples) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

// Chord progression: Dm -> F -> C -> Gm (Epic Heroic RoV Anthem)
const CHORDS = [
  { root: 146.83, notes: [146.83, 174.61, 220.00, 293.66, 349.23, 440.00] }, // Dm (D3, F3, A3, D4, F4, A4)
  { root: 174.61, notes: [174.61, 220.00, 261.63, 349.23, 440.00, 523.25] }, // F  (F3, A3, C4, F4, A4, C5)
  { root: 130.81, notes: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00] }, // C  (C3, E3, G3, C4, E4, G4)
  { root: 196.00, notes: [196.00, 233.08, 293.66, 392.00, 466.16, 587.33] }  // Gm (G3, Bb3, D4, G4, Bb4, D5)
];

const left = new Float32Array(NUM_SAMPLES);
const right = new Float32Array(NUM_SAMPLES);

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const currentBeat = (t / BEAT_DURATION);
  const currentMeasure = Math.floor(currentBeat / 4) % 8;
  const chordIdx = Math.floor(currentMeasure / 2) % 4;
  const chord = CHORDS[chordIdx];

  let sampleL = 0;
  let sampleR = 0;

  // 1. Epic War Drums (Kick / Timpani on beats 0, 1.5, 2, 3)
  const beatFraction = currentBeat % 1;
  const isDrumBeat = (currentBeat % 2 < 0.25) || (currentBeat % 4 >= 2.5 && currentBeat % 4 < 2.75);
  if (isDrumBeat) {
    const drumTime = (currentBeat % 1) * BEAT_DURATION;
    const drumFreq = Math.max(35, 140 * Math.exp(-drumTime * 18));
    const drumEnv = Math.exp(-drumTime * 6.5);
    const drum = Math.sin(2 * Math.PI * drumFreq * drumTime) * drumEnv * 0.45;
    sampleL += drum;
    sampleR += drum;
  }

  // Snare / Hi-hat pulse on every half-beat
  const hatTime = (currentBeat % 0.5) * BEAT_DURATION;
  const hatNoise = (Math.random() * 2 - 1) * Math.exp(-hatTime * 28) * 0.08;
  sampleL += hatNoise;
  sampleR += hatNoise;

  // 2. Heavy Orchestral Bassline
  const bassFreq = chord.root;
  const bassEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * (currentBeat * 2));
  const bass = (Math.sin(2 * Math.PI * (bassFreq / 2) * t) * 0.6 + Math.sin(2 * Math.PI * bassFreq * t) * 0.4) * 0.35;
  sampleL += bass;
  sampleR += bass;

  // 3. Majestic Orchestral Brass / Strings Pad
  let padL = 0;
  let padR = 0;
  for (let n = 0; n < chord.notes.length; n++) {
    const noteFreq = chord.notes[n];
    // Gentle chorus detune
    const o1 = Math.sin(2 * Math.PI * noteFreq * t);
    const o2 = Math.sin(2 * Math.PI * (noteFreq * 1.003) * t + 0.5);
    const o3 = Math.sin(2 * Math.PI * (noteFreq * 0.997) * t + 1.0);
    padL += (o1 + o2) * 0.04;
    padR += (o1 + o3) * 0.04;
  }
  sampleL += padL;
  sampleR += padR;

  // 4. Heroic High String Arpeggio (8th notes melody)
  const arpIdx = Math.floor(currentBeat * 2) % chord.notes.length;
  const arpFreq = chord.notes[arpIdx] * 2; // 1 octave higher
  const arpTime = (currentBeat % 0.5) * BEAT_DURATION;
  const arpEnv = Math.exp(-arpTime * 8);
  const arpTone = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.12;
  sampleL += arpTone * (arpIdx % 2 === 0 ? 1.2 : 0.8);
  sampleR += arpTone * (arpIdx % 2 !== 0 ? 1.2 : 0.8);

  // Master limiting
  left[i] = Math.tanh(sampleL * 1.3) * 0.85;
  right[i] = Math.tanh(sampleR * 1.3) * 0.85;
}

const outDir = path.resolve(__dirname, '../public/assets/audio');
const outFile = path.join(outDir, 'bgm_battlefield.wav');

const numChannels = 2;
const bitsPerSample = 16;
const header = createWavHeader(numChannels, SAMPLE_RATE, bitsPerSample, NUM_SAMPLES);
const dataBuffer = Buffer.alloc(NUM_SAMPLES * numChannels * 2);

let offset = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  let l = Math.max(-1, Math.min(1, left[i]));
  let r = Math.max(-1, Math.min(1, right[i]));
  dataBuffer.writeInt16LE(Math.floor(l * 32767), offset);
  offset += 2;
  dataBuffer.writeInt16LE(Math.floor(r * 32767), offset);
  offset += 2;
}

const fullWav = Buffer.concat([header, dataBuffer]);
fs.writeFileSync(outFile, fullWav);
console.log(`✅ Created Epic BGM: ${outFile} (${(fullWav.length / 1024 / 1024).toFixed(2)} MB, ${DURATION.toFixed(1)}s loop)`);
