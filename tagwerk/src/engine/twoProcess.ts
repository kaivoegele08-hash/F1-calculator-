import {
  ADAPT_MAX_PER_DAY_MIN,
  C_AMPLITUDE,
  C_GAIN,
  C_HARMONICS,
  DAY,
  DEBT_DAYS,
  DEBT_FACTOR_HOURS,
  DEBT_MALUS,
  HOUR,
  I0,
  PHI_REF_H,
  REF_MIDSLEEP_H,
  SEMIDIAN_AMP,
  SEMIDIAN_DIP_AFTER_MIN_H,
  S_START,
  TAU_D_H,
  TAU_I_H,
  TAU_R_H,
} from './constants';
import { buildSleepDays } from './sleepDetection';
import {
  addDaysToKey,
  circularMeanHours,
  dateKey,
  hourOfDay,
  localTimeToMs,
  tzOffsetMin,
  wrapMin,
} from './time';
import type { Profile, SleepSession } from './types';

const OMEGA = (2 * Math.PI) / 24;

/** Raw process C (without gain). `offsetMin` shifts the phase later (positive = night owl). */
export function processC(hour: number, offsetMin = 0): number {
  const x = PHI_REF_H + offsetMin / 60 - hour;
  let sum = 0;
  for (let k = 0; k < C_HARMONICS.length; k++) sum += C_HARMONICS[k] * Math.sin((k + 1) * OMEGA * x);
  return C_AMPLITUDE * sum;
}

/** Circasemidian component that produces the post-lunch dip. */
export function semidian(hour: number, offsetMin = 0): number {
  const tmin = REF_MIDSLEEP_H + offsetMin / 60;
  return -SEMIDIAN_AMP * Math.cos((2 * Math.PI * (hour - (tmin + SEMIDIAN_DIP_AFTER_MIN_H))) / 12);
}

/** Position of process C within its range, 0 = minimum, 1 = maximum. */
export function circadianPosition(hour: number, offsetMin = 0): number {
  return Math.min(1, Math.max(0, (processC(hour, offsetMin) - C_RANGE.min) / (C_RANGE.max - C_RANGE.min)));
}

/** Numerical range of process C over one period. */
export const C_RANGE = (() => {
  let min = Infinity;
  let max = -Infinity;
  for (let h = 0; h < 24; h += 0.05) {
    const c = processC(h, 0);
    if (c < min) min = c;
    if (c > max) max = c;
  }
  return { min, max };
})();

export interface SleepWindow {
  startAt: number;
  endAt: number;
}

/** Homeostatic sleep pressure S, simulated exactly (closed form per segment). */
export class PressureModel {
  private segs: { start: number; end: number; asleep: boolean; s0: number }[] = [];
  private lastEnd: number;
  private lastS: number;

  constructor(intervals: SleepWindow[], from: number, s0 = S_START) {
    const sorted = intervals.filter((i) => i.endAt > from).sort((a, b) => a.startAt - b.startAt);
    let t = from;
    let s = s0;
    for (const iv of sorted) {
      const start = Math.max(iv.startAt, t);
      const end = Math.max(iv.endAt, start);
      if (start > t) {
        this.segs.push({ start: t, end: start, asleep: false, s0: s });
        s = 1 - (1 - s) * Math.exp(-(start - t) / HOUR / TAU_R_H);
      }
      if (end > start) {
        this.segs.push({ start, end, asleep: true, s0: s });
        s = s * Math.exp(-(end - start) / HOUR / TAU_D_H);
      }
      t = end;
    }
    this.lastEnd = t;
    this.lastS = s;
  }

  at(t: number): number {
    const segs = this.segs;
    if (segs.length === 0 || t >= this.lastEnd) {
      const dt = Math.max(0, t - this.lastEnd) / HOUR;
      return 1 - (1 - this.lastS) * Math.exp(-dt / TAU_R_H);
    }
    if (t < segs[0].start) return segs[0].s0;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].start <= t) lo = mid;
      else hi = mid - 1;
    }
    const sg = segs[lo];
    const dt = (t - sg.start) / HOUR;
    return sg.asleep
      ? sg.s0 * Math.exp(-dt / TAU_D_H)
      : 1 - (1 - sg.s0) * Math.exp(-dt / TAU_R_H);
  }
}

export const debtFactor = (debtMinutes: number): number =>
  Math.min(debtMinutes / 60 / DEBT_FACTOR_HOURS, 1);

/** Sleep inertia I(t). Stronger with sleep debt and when waking near the circadian minimum. */
export function inertia(hoursSinceWake: number, debtMinutes: number, circLow = 0): number {
  if (hoursSinceWake < 0) return 0;
  const i0 = I0 * (1 + 0.5 * debtFactor(debtMinutes)) * (1 + 0.5 * circLow);
  return i0 * Math.exp(-hoursSinceWake / TAU_I_H);
}

/** Debt malus D. */
export const debtMalus = (debtMinutes: number): number =>
  DEBT_MALUS * Math.min(debtMinutes / 60 / DEBT_FACTOR_HOURS, 1.5);

/** E_raw(t) = gain*C + semidian - S - I - D. */
export function energyRaw(args: {
  hour: number;
  offsetMin: number;
  s: number;
  hoursSinceWake: number;
  debtMinutes: number;
  circLowAtWake: number;
}): number {
  const { hour, offsetMin, s, hoursSinceWake, debtMinutes, circLowAtWake } = args;
  return (
    C_GAIN * processC(hour, offsetMin) +
    semidian(hour, offsetMin) -
    s -
    inertia(hoursSinceWake, debtMinutes, circLowAtWake) -
    debtMalus(debtMinutes)
  );
}

export interface PhaseResult {
  /** effective phase offset in minutes relative to the 04:00 reference */
  offsetMin: number;
  targetMin: number;
  /** days until the internal clock has caught up (0 = adapted) */
  adaptDaysLeft: number;
  adapting: boolean;
}

const moveToward = (cur: number, target: number, maxStep: number) => {
  const d = wrapMin(target - cur);
  return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep;
};

/**
 * Effective circadian phase (5.7). In shift mode the clock follows the actual main sleep of the
 * last 1-3 days; after a time-zone change it shifts toward the new local time. Either way it
 * moves at most 1 h per day.
 */
export function computeCircadianOffset(
  sessions: SleepSession[],
  profile: Profile,
  now: number,
): PhaseResult {
  const tz = profile.timezone;
  const base = profile.circadianPhaseOffsetMin;
  const shift = profile.workSchedule.shiftMode;
  const today = dateKey(now, tz);
  const days = buildSleepDays(sessions, tz, shift);
  const dates = Array.from({ length: DEBT_DAYS }, (_, i) => addDaysToKey(today, -(DEBT_DAYS - 1 - i)));

  interface Info { mid: number | null; tz: string }
  let lastTz: string | null = null;
  const infos: Info[] = dates.map((d) => {
    const day = days.get(d);
    if (day && day.bedAt != null && day.wakeAt != null) {
      const stz = day.main[0].timezone || tz;
      lastTz = stz;
      return { mid: hourOfDay((day.bedAt + day.wakeAt) / 2, stz), tz: stz };
    }
    return { mid: null, tz: lastTz ?? tz };
  });
  // Days after the last recorded night run in the device zone.
  let lastData = -1;
  infos.forEach((v, i) => { if (v.mid !== null) lastData = i; });
  for (let i = lastData + 1; i < infos.length; i++) infos[i].tz = tz;
  // Leading days without data take the zone of the first known day.
  const firstData = infos.findIndex((v) => v.mid !== null);
  if (firstData > 0) for (let i = 0; i < firstData; i++) infos[i].tz = infos[firstData].tz;

  const targetAt = (i: number): number => {
    if (!shift) return base;
    const mids: number[] = [];
    for (let k = Math.max(0, i - 2); k <= i; k++) if (infos[k].mid !== null) mids.push(infos[k].mid as number);
    if (mids.length === 0) return NaN;
    return wrapMin((circularMeanHours(mids) - REF_MIDSLEEP_H) * 60);
  };

  let target = shift ? NaN : base;
  let offset = base;
  if (shift) {
    for (let i = 0; i < infos.length && Number.isNaN(target); i++) target = targetAt(i);
    offset = Number.isNaN(target) ? base : target;
    if (Number.isNaN(target)) target = base;
  }
  for (let i = 0; i < infos.length; i++) {
    if (i > 0 && infos[i].tz !== infos[i - 1].tz) {
      const inst = localTimeToMs(dates[i], '12:00', infos[i].tz);
      const delta = tzOffsetMin(inst, infos[i].tz) - tzOffsetMin(inst, infos[i - 1].tz);
      offset = wrapMin(offset + delta);
    }
    const t = targetAt(i);
    if (!Number.isNaN(t)) target = t;
    offset = moveToward(offset, target, ADAPT_MAX_PER_DAY_MIN);
  }
  const remaining = Math.abs(wrapMin(target - offset));
  const adaptDaysLeft = Math.max(0, Math.ceil(remaining / ADAPT_MAX_PER_DAY_MIN - 1e-9));
  return { offsetMin: offset, targetMin: target, adaptDaysLeft, adapting: adaptDaysLeft > 0 };
}

/** Convenience for tests and the curve: day boundaries. */
export const startOfWindow = (now: number): number => now - DEBT_DAYS * DAY;
