export type NoiseKind = 'rain' | 'noise' | 'waves' | 'fan';

export const NOISE_LABELS: Record<NoiseKind, string> = {
  rain: 'Regen',
  noise: 'Rauschen',
  waves: 'Wellen',
  fan: 'Ventilator',
};

/** Small deterministic PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate seamlessly looping noise samples in [-1, 1]. */
export function generateNoise(kind: NoiseKind, seconds = 10, sampleRate = 16000): Float32Array {
  const n = Math.floor(seconds * sampleRate);
  const pad = Math.floor(sampleRate * 0.5); // crossfade length
  const total = n + pad;
  const r = rng(kind.length * 977 + 13);
  const raw = new Float32Array(total);
  let lp = 0;
  let lp2 = 0;
  let brown = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < total; i++) {
    const white = r() * 2 - 1;
    let v = 0;
    switch (kind) {
      case 'noise': {
        // pink noise (Paul Kellet's filter)
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        v = (b0 + b1 + b2 + white * 0.1848) * 0.2;
        break;
      }
      case 'rain': {
        lp += 0.35 * (white - lp);
        const drop = r() < 0.0008 ? (r() * 2 - 1) * 1.2 : 0;
        v = (white - lp) * 0.45 + drop;
        break;
      }
      case 'waves': {
        brown = (brown + 0.02 * white) / 1.02;
        lp += 0.05 * (brown * 6 - lp);
        const swell = 0.55 + 0.45 * Math.sin((2 * Math.PI * i) / (sampleRate * (seconds / 2)));
        v = lp * swell * 1.6;
        break;
      }
      case 'fan': {
        lp += 0.08 * (white - lp);
        lp2 += 0.01 * (white - lp2);
        v = lp * 0.5 + lp2 * 1.2 + 0.08 * Math.sin((2 * Math.PI * 110 * i) / sampleRate);
        break;
      }
    }
    raw[i] = v;
  }
  // Crossfade the tail into the head so the loop has no click.
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = raw[i];
  for (let i = 0; i < pad; i++) {
    const w = i / pad;
    out[i] = raw[i] * w + raw[n + i] * (1 - w);
  }
  // Normalise to a comfortable peak.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.6 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= gain;
  return out;
}

/** Encode samples as a 16-bit mono PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate = 16000): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const write = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return bytes;
}

export function makeNoiseWav(kind: NoiseKind, seconds = 10, sampleRate = 16000): Uint8Array {
  return encodeWav(generateNoise(kind, seconds, sampleRate), sampleRate);
}

export type BreathPhase = 'inhale' | 'hold' | 'exhale';
export const BREATH = { inhale: 4, hold: 7, exhale: 8 } as const;
export const BREATH_CYCLE_S = BREATH.inhale + BREATH.hold + BREATH.exhale;

/** Phase, seconds left in the phase, circle scale (0.5..1) and cycle count for an elapsed time. */
export function breathState(elapsedMs: number): { phase: BreathPhase; remaining: number; scale: number; cycle: number } {
  const s = elapsedMs / 1000;
  const cycle = Math.floor(s / BREATH_CYCLE_S);
  const c = s - cycle * BREATH_CYCLE_S;
  if (c < BREATH.inhale) return { phase: 'inhale', remaining: BREATH.inhale - c, scale: 0.5 + 0.5 * (c / BREATH.inhale), cycle };
  if (c < BREATH.inhale + BREATH.hold) return { phase: 'hold', remaining: BREATH.inhale + BREATH.hold - c, scale: 1, cycle };
  const e = c - BREATH.inhale - BREATH.hold;
  return { phase: 'exhale', remaining: BREATH_CYCLE_S - c, scale: 1 - 0.5 * (e / BREATH.exhale), cycle };
}

/** Volume multiplier for a sleep timer fade during the last `fadeS` seconds. */
export function fadeVolume(remainingS: number, fadeS = 20): number {
  if (remainingS <= 0) return 0;
  return Math.min(1, remainingS / fadeS);
}
