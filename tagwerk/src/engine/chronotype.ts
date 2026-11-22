import {
  CHRONO_MIN_NIGHTS,
  MSF_EARLY_MAX_H,
  MSF_LATE_MIN_H,
  OFFSET_LIMIT_MIN,
  OFFSET_MAX_WEEKLY_CHANGE_MIN,
  REF_MIDSLEEP_H,
  DAY,
} from './constants';
import { buildSleepDays } from './sleepDetection';
import { circularMeanHours, dayOfWeekOfKey, hourOfDay, mean, parseHHmm } from './time';
import type { Chronotype, Profile, SleepSession } from './types';

export type PeakTime = 'morning' | 'midday' | 'evening' | 'night';

export interface ChronotypeAnswers {
  freeSleepStart: string;
  freeWake: string;
  workBed: string;
  workWake: string;
  peak?: PeakTime;
  /** number of work days per week, default 5 */
  workDaysPerWeek?: number;
}

export interface ChronotypeResult {
  /** mid-sleep on free days, clock hours */
  msf: number;
  msfsc: number;
  chronotype: Chronotype;
  /** -1 (very early) … 1 (very late) */
  score: number;
  offsetMin: number;
  socialJetlagHours: number;
}

/** Sleep duration in hours between two clock times, crossing midnight if needed. */
export function sleepDurationH(start: string, end: string): number {
  let d = parseHHmm(end) - parseHHmm(start);
  if (d <= 0) d += 24;
  return d;
}

/** Mid-sleep as a clock hour in [-6, 18) so that 23:30-start sleeps compare sanely. */
export function midSleepHours(start: string, end: string): number {
  const mid = (parseHHmm(start) + sleepDurationH(start, end) / 2) % 24;
  return mid >= 18 ? mid - 24 : mid;
}

export function classify(msfsc: number): Chronotype {
  if (msfsc < MSF_EARLY_MAX_H) return 'early';
  if (msfsc > MSF_LATE_MIN_H) return 'late';
  return 'intermediate';
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PEAK_NUDGE: Record<PeakTime, number> = { morning: -0.25, midday: 0, evening: 0.25, night: 0.5 };

/** Chronotype from the onboarding questionnaire (MSF / MSFsc logic, 5.6). */
export function chronotypeFromAnswers(a: ChronotypeAnswers): ChronotypeResult {
  const sdFree = sleepDurationH(a.freeSleepStart, a.freeWake);
  const sdWork = sleepDurationH(a.workBed, a.workWake);
  const wd = a.workDaysPerWeek ?? 5;
  const sdWeek = (sdWork * wd + sdFree * (7 - wd)) / 7;
  const msf = midSleepHours(a.freeSleepStart, a.freeWake);
  const correction = sdFree > sdWeek ? (sdFree - sdWeek) / 2 : 0;
  const msfsc = msf - correction + (a.peak ? PEAK_NUDGE[a.peak] : 0);
  const msfWork = midSleepHours(a.workBed, a.workWake);
  return {
    msf,
    msfsc,
    chronotype: classify(msfsc),
    score: clamp((msfsc - REF_MIDSLEEP_H) / 3, -1, 1),
    offsetMin: clamp(Math.round((msfsc - REF_MIDSLEEP_H) * 60), -OFFSET_LIMIT_MIN, OFFSET_LIMIT_MIN),
    socialJetlagHours: Math.abs(msf - msfWork),
  };
}

export interface LearnedChronotype extends ChronotypeResult {
  offsetMin: number;
  nights: number;
  freeNights: number;
  changed: boolean;
}

/**
 * Re-estimate MSFsc from real free days (>= 21 nights) and move the stored offset slowly,
 * at most 15 minutes per week (5.6).
 */
export function learnChronotype(
  sessions: SleepSession[],
  profile: Profile,
  now: number,
  lastUpdatedAt?: number,
): LearnedChronotype | null {
  const tz = profile.timezone;
  const ws = profile.workSchedule;
  if (ws.shiftMode) return null;
  const days = [...buildSleepDays(sessions, tz, false).values()].filter(
    (d) => d.main.length > 0 && d.bedAt != null && d.wakeAt != null,
  );
  if (days.length < CHRONO_MIN_NIGHTS) return null;
  const free = days.filter((d) => !ws.workDays.includes(dayOfWeekOfKey(d.date)));
  const work = days.filter((d) => ws.workDays.includes(dayOfWeekOfKey(d.date)));
  if (free.length < 3) return null;
  const mid = (d: (typeof days)[number]) =>
    hourOfDay(((d.bedAt as number) + (d.wakeAt as number)) / 2, tz);
  const msfRaw = circularMeanHours(free.map(mid));
  const msf = msfRaw >= 18 ? msfRaw - 24 : msfRaw;
  const sdFree = mean(free.map((d) => d.mainMinutes / 60));
  const sdWork = work.length ? mean(work.map((d) => d.mainMinutes / 60)) : sdFree;
  const wd = ws.workDays.length;
  const sdWeek = (sdWork * wd + sdFree * (7 - wd)) / 7;
  const msfsc = msf - (sdFree > sdWeek ? (sdFree - sdWeek) / 2 : 0);
  const target = clamp((msfsc - REF_MIDSLEEP_H) * 60, -OFFSET_LIMIT_MIN, OFFSET_LIMIT_MIN);
  const weeks = lastUpdatedAt == null ? 1 : Math.max(0, (now - lastUpdatedAt) / (7 * DAY));
  const maxStep = OFFSET_MAX_WEEKLY_CHANGE_MIN * weeks;
  const cur = profile.circadianPhaseOffsetMin;
  const next = cur + clamp(target - cur, -maxStep, maxStep);
  const workMid = work.length ? circularMeanHours(work.map(mid)) : msfRaw;
  const workMidN = workMid >= 18 ? workMid - 24 : workMid;
  return {
    msf,
    msfsc,
    chronotype: classify(msfsc),
    score: clamp((msfsc - REF_MIDSLEEP_H) / 3, -1, 1),
    offsetMin: next,
    socialJetlagHours: Math.abs(msf - workMidN),
    nights: days.length,
    freeNights: free.length,
    changed: Math.abs(next - cur) > 0.01,
  };
}
