import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_RATE = 44100;

function createWavHeader(numChannels, sampleRate, bitsPerSample, numSamples) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function writeWav(filename, leftChannel, rightChannel) {
  const numSamples = leftChannel.length;
  const numChannels = rightChannel ? 2 : 1;
  const bitsPerSample = 16;
  const header = createWavHeader(numChannels, SAMPLE_RATE, bitsPerSample, numSamples);
  const dataBuffer = Buffer.alloc(numSamples * numChannels * 2);

  let offset = 0;
  for (let i = 0; i < numSamples; i++) {
    let l = Math.max(-1, Math.min(1, leftChannel[i]));
    let lSample = Math.floor(l * 32767);
    dataBuffer.writeInt16LE(lSample, offset);
    offset += 2;

    if (rightChannel) {
      let r = Math.max(-1, Math.min(1, rightChannel[i]));
      let rSample = Math.floor(r * 32767);
      dataBuffer.writeInt16LE(rSample, offset);
      offset += 2;
    }
  }

  const fullBuffer = Buffer.concat([header, dataBuffer]);
  fs.writeFileSync(filename, fullBuffer);
  console.log(`Created: ${filename} (${fullBuffer.length} bytes)`);
}

// Soft saturation curve (analogue tube warmth)
function saturate(x, k = 2.0) {
  return Math.tanh(k * x);
}

// -------------------------------------------------------------
// 1. TOWER LOCK-ON WARNING ALARM (3 High-Tension Cyber Strobe Beeps)
// -------------------------------------------------------------
function generateTowerLock() {
  const duration = 1.4;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sampleL = 0;
    let sampleR = 0;

    for (let p = 0; p < 3; p++) {
      const pStart = p * 0.35;
      const pDur = 0.22;
      if (t >= pStart && t < pStart + pDur) {
        const pt = t - pStart;
        const env = Math.exp(-pt * 16) * Math.sin((pt / pDur) * Math.PI);

        const f1 = 1050 + Math.sin(pt * 40) * 120;
        const f2 = 1420 + Math.cos(pt * 30) * 80;
        const osc1 = Math.sin(2 * Math.PI * f1 * pt);
        const osc2 = Math.sin(2 * Math.PI * f2 * pt + 0.5 * Math.sin(2 * Math.PI * 300 * pt));
        const sub = Math.sin(2 * Math.PI * 350 * pt);

        const hiss = (Math.random() * 2 - 1) * Math.exp(-pt * 25) * 0.2;

        const combined = (osc1 * 0.45 + osc2 * 0.35 + sub * 0.2 + hiss) * env;
        sampleL += saturate(combined * 1.4, 2.2);
        sampleR += saturate(combined * 1.4, 2.2);
      }
    }

    const droneEnv = Math.sin((t / duration) * Math.PI) * 0.15;
    const drone = Math.sin(2 * Math.PI * 180 * t) * droneEnv;
    sampleL += drone;
    sampleR += drone;

    left[i] = sampleL * 0.85;
    right[i] = sampleR * 0.85;
  }

  return { left, right };
}

// -------------------------------------------------------------
// 2. TOWER ENERGY CHARGE (Searing Arcane Laser Vortex Windup)
// -------------------------------------------------------------
function generateTowerCharge() {
  const duration = 1.1;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;
    const env = Math.pow(progress, 2.2);

    const freq = 120 * Math.pow(15, progress);
    const osc1 = Math.sin(2 * Math.PI * freq * t);
    const osc2 = Math.sin(2 * Math.PI * (freq * 1.5) * t + 0.4);
    const osc3 = Math.sin(2 * Math.PI * (freq * 2.02) * t);

    const arcNoise = (Math.random() * 2 - 1) * (Math.random() > 0.85 ? 1 : 0) * env * 0.4;
    const plasmaHiss = (Math.random() * 2 - 1) * Math.sin(progress * Math.PI) * 0.25;
    const subRumble = Math.sin(2 * Math.PI * (60 + progress * 80) * t) * (1 - progress * 0.5) * 0.4;

    const mono = (osc1 * 0.35 + osc2 * 0.25 + osc3 * 0.2 + arcNoise + plasmaHiss + subRumble) * env;
    left[i] = saturate(mono * (1 + 0.2 * Math.sin(t * 20)), 2.5) * 0.85;
    right[i] = saturate(mono * (1 + 0.2 * Math.cos(t * 20)), 2.5) * 0.85;
  }

  return { left, right };
}

// -------------------------------------------------------------
// 3. TOWER PLASMA CANNON SHOT RELEASE (Deep 808 Shockwave + Laser)
// -------------------------------------------------------------
function generateTowerFire() {
  const duration = 1.2;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    const subFreq = Math.max(30, 260 * Math.exp(-t * 14));
    const subEnv = Math.exp(-t * 4.5);
    const sub = Math.sin(2 * Math.PI * subFreq * t) * subEnv;

    const laserEnv = Math.exp(-t * 22);
    const laserFreq = Math.max(80, 2400 * Math.exp(-t * 18));
    const laser = (Math.sin(2 * Math.PI * laserFreq * t) + (Math.random() * 2 - 1) * 0.4) * laserEnv;

    const whooshEnv = Math.sin(Math.min(Math.PI, t * 8)) * Math.exp(-t * 3);
    const whooshFreq = Math.max(120, 900 * Math.exp(-t * 4));
    const whoosh = Math.sin(2 * Math.PI * whooshFreq * t) * whooshEnv * 0.35;

    const punchNoise = (Math.random() * 2 - 1) * Math.exp(-t * 35) * 0.6;

    const raw = sub * 0.7 + laser * 0.5 + whoosh * 0.3 + punchNoise * 0.4;
    const finalVal = saturate(raw * 1.8, 2.0);

    left[i] = finalVal * 0.95;
    right[i] = finalVal * 0.95;
  }

  return { left, right };
}

// -------------------------------------------------------------
// 4. PLAYER HIT / TOWER BEAM EXPLOSION (Devastating AAA Impact)
// -------------------------------------------------------------
function generatePlayerHit() {
  const duration = 1.5;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Sub-bass thump
    const subFreq = Math.max(24, 180 * Math.exp(-t * 9));
    const subEnv = Math.exp(-t * 3.2);
    const sub = Math.sin(2 * Math.PI * subFreq * t) * subEnv * 0.85;

    // Destructive Shattering Plasma Blast
    const blastEnv = Math.exp(-t * 7.5);
    const blastNoise1 = (Math.random() * 2 - 1) * blastEnv;
    const blastNoise2 = (Math.random() * 2 - 1) * Math.exp(-t * 18);
    const blast = (blastNoise1 * 0.6 + blastNoise2 * 0.4) * 0.75;

    // Metallic Armor Crunch
    const crunchEnv = Math.exp(-t * 12);
    const crunchFreq = Math.max(50, 420 * Math.exp(-t * 12));
    const crunch = Math.sin(2 * Math.PI * crunchFreq * t + Math.sin(2 * Math.PI * 95 * t) * 3) * crunchEnv * 0.5;

    // Electric Aftershock
    const tailEnv = Math.exp(-t * 2.5) * (1 - Math.exp(-t * 15));
    const electricTail = (Math.random() * 2 - 1) * tailEnv * (Math.sin(2 * Math.PI * 60 * t) > 0 ? 0.35 : 0.05);

    // Low rumble body
    const bodyRumble = Math.sin(2 * Math.PI * 48 * t) * Math.exp(-t * 2.0) * 0.4;

    const rawL = sub + blast * 1.1 + crunch + electricTail + bodyRumble;
    const rawR = sub + blast * 0.95 + crunch * 1.05 + electricTail * 1.2 + bodyRumble;

    left[i] = saturate(rawL * 1.6, 2.2) * 0.95;
    right[i] = saturate(rawR * 1.6, 2.2) * 0.95;
  }

  return { left, right };
}

// -------------------------------------------------------------
// 5. SHIELD DEFLECTION (Divine Crystalline Barrier Gong)
// -------------------------------------------------------------
function generateShieldBlock() {
  const duration = 1.3;
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    const pingEnv = Math.exp(-t * 9);
    const ping = Math.sin(2 * Math.PI * 1850 * t) * pingEnv * 0.6;

    const gongEnv = Math.exp(-t * 3.5);
    const p1 = Math.sin(2 * Math.PI * 520 * t);
    const p2 = Math.sin(2 * Math.PI * 1040 * t) * 0.5;
    const p3 = Math.sin(2 * Math.PI * 1560 * t) * 0.35;
    const p4 = Math.sin(2 * Math.PI * 2600 * t) * 0.25;
    const gong = (p1 + p2 + p3 + p4) * gongEnv * 0.5;

    const shimmerEnv = Math.exp(-t * 5.0) * (1 - Math.exp(-t * 40));
    const shimmer = (Math.random() * 2 - 1) * shimmerEnv * 0.3;

    const subPunch = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 18) * 0.45;

    const raw = ping + gong + shimmer + subPunch;
    const finalVal = saturate(raw * 1.5, 2.0);

    left[i] = finalVal * 0.92;
    right[i] = finalVal * 0.92;
  }

  return { left, right };
}

const outDir = path.resolve(__dirname, '../public/assets/audio');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating AAA RoV Sound Effects into:', outDir);

const lock = generateTowerLock();
writeWav(path.join(outDir, 'tower_lock.wav'), lock.left, lock.right);

const charge = generateTowerCharge();
writeWav(path.join(outDir, 'tower_charge.wav'), charge.left, charge.right);

const fire = generateTowerFire();
writeWav(path.join(outDir, 'tower_fire.wav'), fire.left, fire.right);

const hit = generatePlayerHit();
writeWav(path.join(outDir, 'player_hit.wav'), hit.left, hit.right);

const block = generateShieldBlock();
writeWav(path.join(outDir, 'shield_block.wav'), block.left, block.right);

console.log('✅ ALL AAA SOUNDS GENERATED SUCCESSFULLY!');
