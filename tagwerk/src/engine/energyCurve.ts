import {
  CURVE_STEP_MIN,
  DAY,
  E_MAX_REF,
  E_MIN_REF,
  HOUR,
  INERTIA_DONE,
  MIN,
  SMOOTH_MIN,
  WINDOW_MAX_MIN,
  WINDOW_MIN_MIN,
  WINDOW_TOLERANCE,
} from './constants';
import { circadianPosition, energyRaw, inertia, PressureModel, type SleepWindow } from './twoProcess';
import { makeClock } from './time';
import type { CurveFeatures, CurvePoint, Interval } from './types';

export function normalizeEnergy(raw: number): number {
  const v = (100 * (raw - E_MIN_REF)) / (E_MAX_REF - E_MIN_REF);
  return Math.min(100, Math.max(0, v));
}

export interface CurveInput {
  intervals: SleepWindow[];
  wakeAt: number;
  /** start of simulation (usually wakeAt - 14 days) */
  from: number;
  tz: string;
  offsetMin: number;
  debtMinutes: number;
  /** length of the curve, default 24 h after waking */
  spanMs?: number;
}

export interface CurveResult {
  points: CurvePoint[];
  wakeAt: number;
  circLowAtWake: number;
}

/** Hours after waking until inertia drops below the threshold (5.5). */
export function grogginessEndAfter(debtMinutes: number, circLow: number): number {
  let lo = 0;
  let hi = 8;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inertia(mid, debtMinutes, circLow) < INERTIA_DONE) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Energy curve on a fixed 0-100 scale in 5-minute steps (5.5). */
export function buildCurve(input: CurveInput): CurveResult {
  const { intervals, wakeAt, from, tz, offsetMin, debtMinutes } = input;
  const span = input.spanMs ?? DAY;
  const clock = makeClock(tz);
  const model = new PressureModel(intervals, from);
  const circLowAtWake = 1 - circadianPosition(clock(wakeAt), offsetMin);
  const step = CURVE_STEP_MIN * MIN;
  const points: CurvePoint[] = [];
  for (let t = wakeAt; t <= wakeAt + span; t += step) {
    const raw = energyRaw({
      hour: clock(t),
      offsetMin,
      s: model.at(t),
      hoursSinceWake: (t - wakeAt) / HOUR,
      debtMinutes,
      circLowAtWake,
    });
    points.push({ t, energy: normalizeEnergy(raw) });
  }
  return { points, wakeAt, circLowAtWake };
}

function smooth(values: number[], windowPoints: number): number[] {
  const half = Math.floor(windowPoints / 2);
  return values.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(values.length - 1, i + half); k++) {
      s += values[k];
      n++;
    }
    return s / n;
  });
}

/** Expand around an extremum to the region within ±tolerance, clamped to 45..150 minutes. */
export function extremumWindow(
  pts: CurvePoint[],
  idx: number,
  kind: 'max' | 'min',
  lowT: number,
  highT: number,
): Interval {
  const ref = pts[idx].energy;
  const ok = (e: number) => (kind === 'max' ? e >= ref - WINDOW_TOLERANCE : e <= ref + WINDOW_TOLERANCE);
  let a = idx;
  let b = idx;
  while (a > 0 && pts[a - 1].t >= lowT && ok(pts[a - 1].energy)) a--;
  while (b < pts.length - 1 && pts[b + 1].t <= highT && ok(pts[b + 1].energy)) b++;
  const center = pts[idx].t;
  let start = pts[a].t;
  let end = pts[b].t;
  if (end - start < WINDOW_MIN_MIN * MIN) {
    start = center - (WINDOW_MIN_MIN * MIN) / 2;
    end = center + (WINDOW_MIN_MIN * MIN) / 2;
  }
  if (end - start > WINDOW_MAX_MIN * MIN) {
    start = Math.max(start, center - (WINDOW_MAX_MIN * MIN) / 2);
    end = Math.min(end, center + (WINDOW_MAX_MIN * MIN) / 2);
    if (end - start > WINDOW_MAX_MIN * MIN) end = start + WINDOW_MAX_MIN * MIN;
  }
  start = Math.max(start, lowT);
  end = Math.min(end, highT);
  return { start, end };
}

const around = (t: number, minutes: number): Interval => ({
  start: t - (minutes * MIN) / 2,
  end: t + (minutes * MIN) / 2,
});

export interface FeatureInput {
  curve: CurveResult;
  debtMinutes: number;
  /** end of the awake day (bedtime) */
  awakeEnd: number;
  /** start of melatonin window, used for the evening-peak fallback */
  melatoninStart: number;
}

/** Find grogginess end, morning peak, afternoon dip and evening peak (5.5). */
export function findFeatures(input: FeatureInput): CurveFeatures {
  const { curve, debtMinutes, awakeEnd, melatoninStart } = input;
  const wake = curve.wakeAt;
  const gEnd = wake + grogginessEndAfter(debtMinutes, curve.circLowAtWake) * HOUR;
  const pts = curve.points.filter((p) => p.t <= awakeEnd);
  const sm = smooth(pts.map((p) => p.energy), SMOOTH_MIN / CURVE_STEP_MIN + 1);
  const view = pts.map((p, i) => ({ t: p.t, energy: sm[i] }));
  const start = Math.max(0, view.findIndex((p) => p.t >= gEnd));

  const maxima: number[] = [];
  const minima: number[] = [];
  let lastDir = 0;
  for (let i = start; i < view.length - 1; i++) {
    const d = view[i + 1].energy - view[i].energy;
    const dir = Math.abs(d) < 1e-9 ? 0 : Math.sign(d);
    if (dir === 0) continue;
    if (lastDir > 0 && dir < 0) maxima.push(i);
    if (lastDir < 0 && dir > 0) minima.push(i);
    lastDir = dir;
  }

  let heuristic = false;
  let morningIdx: number | null = maxima.length ? maxima[0] : null;
  let eveningIdx: number | null = null;
  let dipIdx: number | null = null;
  if (morningIdx !== null) {
    const later = maxima.filter((m) => m > morningIdx!);
    for (const ev of later) {
      const between = minima.filter((m) => m > morningIdx! && m < ev);
      if (between.length) {
        const dip = between.reduce((a, b) => (view[b].energy < view[a].energy ? b : a));
        if (view[morningIdx].energy - view[dip].energy >= 1 && view[ev].energy - view[dip].energy >= 1) {
          if (eveningIdx === null || view[ev].energy > view[eveningIdx].energy) {
            eveningIdx = ev;
            dipIdx = dip;
          }
        }
      }
    }
  }

  const lowT = wake;
  const highT = awakeEnd;
  let morningPeak: Interval;
  let afternoonDip: Interval;
  let eveningPeak: Interval;
  if (morningIdx !== null && dipIdx !== null && eveningIdx !== null) {
    morningPeak = extremumWindow(view, morningIdx, 'max', gEnd, highT);
    afternoonDip = extremumWindow(view, dipIdx, 'min', lowT, highT);
    eveningPeak = extremumWindow(view, eveningIdx, 'max', lowT, highT);
  } else {
    heuristic = true;
    morningPeak = around(wake + 3 * HOUR, 120);
    afternoonDip = around(wake + 8 * HOUR, 90);
    eveningPeak = around(Math.min(melatoninStart - 3 * HOUR, awakeEnd - 3 * HOUR), 120);
  }
  return { grogginessEnd: gEnd, morningPeak, afternoonDip, eveningPeak, heuristic };
}

/** Energy value at an instant (linear interpolation). */
export function energyAt(points: CurvePoint[], t: number): number {
  if (points.length === 0) return 0;
  if (t <= points[0].t) return points[0].energy;
  const last = points[points.length - 1];
  if (t >= last.t) return last.energy;
  const step = CURVE_STEP_MIN * MIN;
  const i = Math.min(points.length - 2, Math.floor((t - points[0].t) / step));
  const a = points[i];
  const b = points[i + 1];
  return a.energy + ((b.energy - a.energy) * (t - a.t)) / (b.t - a.t);
}
