import {
  DAY,
  DEBT_DAYS,
  DEFAULT_WAKE_BEFORE_START_H,
  ENGINE_VERSION,
  HABITUAL_ONSET_REF_H,
  HOUR,
  MIN,
  SLEEP_ONSET_MIN,
} from './constants';
import { buildCurve, energyAt, findFeatures, type CurveResult } from './energyCurve';
import { computeDebt, forecastDebt, type DebtForecast, type DebtResult } from './sleepDebt';
import { buildSleepDays, sleepIntervals } from './sleepDetection';
import { defaultNeedMinutes } from './sleepNeed';
import { computeCircadianOffset, type PhaseResult } from './twoProcess';
import { dateKey, parseHHmm } from './time';
import type { CurveFeatures, DayWindow, Profile, SleepSession, WindowKind } from './types';
import {
  buildWindows,
  melatoninWindow,
  nextClockTime,
  recommendBedtime,
  type BedtimeResult,
  type MelatoninWindow,
} from './windows';

export type DayPhase =
  | 'grogginess'
  | 'morning_peak'
  | 'afternoon_dip'
  | 'evening_peak'
  | 'wind_down'
  | 'melatonin'
  | 'neutral';

export interface DayPlan {
  engineVersion: number;
  /** local date of waking, YYYY-MM-DD */
  date: string;
  now: number;
  wakeAt: number;
  /** false when the wake time was estimated from the profile */
  hasWakeData: boolean;
  needMinutes: number;
  debt: DebtResult;
  phase: PhaseResult;
  curve: CurveResult;
  features: CurveFeatures;
  windows: DayWindow[];
  melatonin: MelatoninWindow;
  bedtime: BedtimeResult;
  forecast: DebtForecast;
  currentEnergy: number;
  currentPhase: DayPhase;
  nextEvent: { kind: WindowKind; at: number } | null;
}

export interface DayPlanInput {
  sessions: SleepSession[];
  profile: Profile;
  now: number;
  /** precomputed need; defaults to manual > stored estimate > age default */
  needMinutes?: number;
}

const PHASE_KINDS: [WindowKind, DayPhase][] = [
  ['grogginess', 'grogginess'],
  ['morning_peak', 'morning_peak'],
  ['afternoon_dip', 'afternoon_dip'],
  ['evening_peak', 'evening_peak'],
  ['melatonin', 'melatonin'],
  ['wind_down', 'wind_down'],
];

export function resolveNeed(profile: Profile, now: number): number {
  return (
    profile.sleepNeedMinutesManual ??
    profile.sleepNeedMinutesEstimated ??
    defaultNeedMinutes(profile.birthYear, now)
  );
}

/** Compute everything the app shows for one waking day. */
export function computeDayPlan(input: DayPlanInput): DayPlan {
  const { profile, now } = input;
  const tz = profile.timezone;
  const shift = profile.workSchedule.shiftMode;
  const need = input.needMinutes ?? resolveNeed(profile, now);
  const recent = input.sessions.filter((s) => s.endAt > now - (DEBT_DAYS + 7) * DAY);

  const phase = computeCircadianOffset(recent, profile, now);

  // Anchor: the most recent main-sleep wake-up that is less than 22 h ago.
  const days = [...buildSleepDays(recent, tz, shift).values()].filter(
    (d) => d.wakeAt != null && d.wakeAt <= now,
  );
  const lastWake = days.length ? Math.max(...days.map((d) => d.wakeAt as number)) : null;
  let wakeAt: number;
  let hasWakeData = false;
  if (lastWake != null && now - lastWake < 22 * HOUR) {
    wakeAt = lastWake;
    hasWakeData = true;
  } else {
    const clock = profile.targetWakeTime
      ? parseHHmm(profile.targetWakeTime)
      : HABITUAL_ONSET_REF_H + phase.offsetMin / 60 + need / 60 + 0;
    const nowNorm = now + 1; // last occurrence at or before now
    wakeAt = nextClockTime(nowNorm - DAY, clock, tz);
    if (wakeAt > now) wakeAt = nextClockTime(nowNorm - 2 * DAY, clock, tz);
  }

  const date = dateKey(wakeAt, tz);
  const debt = computeDebt(recent, need, tz, wakeAt, { refDate: date, shiftMode: shift });
  const melatonin = melatoninWindow(wakeAt, phase.offsetMin, tz);
  const bedtime = recommendBedtime({
    wakeAt,
    profile,
    needMinutes: need,
    debtMinutes: debt.debtMinutes,
    melatonin,
  });

  const intervals = sleepIntervals(recent, tz, shift);
  const curve = buildCurve({
    intervals,
    wakeAt,
    from: wakeAt - DEBT_DAYS * DAY,
    tz,
    offsetMin: phase.offsetMin,
    debtMinutes: debt.debtMinutes,
  });
  const features = findFeatures({
    curve,
    debtMinutes: debt.debtMinutes,
    awakeEnd: bedtime.bedtime,
    melatoninStart: melatonin.start,
  });
  const windows = buildWindows({
    wakeAt,
    features,
    bedtime: bedtime.bedtime,
    melatonin,
    caffeineCutoffHours: profile.caffeineCutoffHours,
    debtMinutes: debt.debtMinutes,
  });
  const forecast = forecastDebt(recent, need, tz, now, bedtime.bedtime, bedtime.wakeAt);

  let currentPhase: DayPhase = 'neutral';
  for (const [kind, ph] of PHASE_KINDS) {
    const w = windows.find((x) => x.kind === kind);
    if (w && now >= w.start && now < w.end) {
      currentPhase = ph;
      break;
    }
  }
  const upcoming = windows
    .filter((w) => w.kind !== 'grogginess' && w.start > now)
    .sort((a, b) => a.start - b.start)[0];

  return {
    engineVersion: ENGINE_VERSION,
    date,
    now,
    wakeAt,
    hasWakeData,
    needMinutes: need,
    debt,
    phase,
    curve,
    features,
    windows,
    melatonin,
    bedtime,
    forecast,
    currentEnergy: energyAt(curve.points, Math.min(Math.max(now, wakeAt), bedtime.bedtime)),
    currentPhase,
    nextEvent: upcoming ? { kind: upcoming.kind, at: upcoming.start } : null,
  };
}

/** Preview of tomorrow, assuming a full night starting at the recommended bedtime. */
export function computeTomorrowPlan(input: DayPlanInput, today?: DayPlan): DayPlan {
  const plan = today ?? computeDayPlan(input);
  const tz = input.profile.timezone;
  const sim: SleepSession = {
    id: 'simulated-night',
    startAt: plan.bedtime.bedtime + SLEEP_ONSET_MIN * MIN,
    endAt: plan.bedtime.wakeAt,
    asleepMinutes: null,
    source: 'manual',
    confidence: 1,
    isNap: false,
    timezone: tz,
    userEdited: true,
  };
  return computeDayPlan({
    ...input,
    sessions: [...input.sessions, sim],
    now: plan.bedtime.wakeAt + 5 * MIN,
  });
}

export const DEFAULT_WAKE_OFFSET_H = DEFAULT_WAKE_BEFORE_START_H;

/** Which phase the day is in at time `t` (used for scrubbing and labels). */
export function phaseAt(plan: DayPlan, t: number): DayPhase {
  for (const [kind, ph] of PHASE_KINDS) {
    const w = plan.windows.find((x) => x.kind === kind);
    if (w && t >= w.start && t < w.end) return ph;
  }
  return 'neutral';
}
