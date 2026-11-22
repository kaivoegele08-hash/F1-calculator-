import {
  DEBT_DAYS,
  DEBT_LOW_MAX,
  DEBT_MAX_MISSING,
  DEBT_MID_MAX,
  DEBT_W_MIN,
  NAP_WEIGHT,
  SLEEP_ONSET_MIN,
  SURPLUS_FACTOR,
  MIN,
} from './constants';
import { buildSleepDays } from './sleepDetection';
import { addDaysToKey, dateKey, median } from './time';
import type { DebtLevel, SleepSession } from './types';

export interface DebtNight {
  date: string;
  /** index 0 = most recent night */
  index: number;
  sleptMinutes: number;
  /** true if the night had no data and was filled with the median */
  estimated: boolean;
  deltaMinutes: number;
  weight: number;
  contributionMinutes: number;
}

export interface DebtResult {
  debtMinutes: number;
  level: DebtLevel;
  nights: DebtNight[];
  missingCount: number;
  insufficientData: boolean;
  /** only when insufficientData: plausible range in minutes */
  range: [number, number] | null;
}

export const weightFor = (i: number): number => 1 - i * ((1 - DEBT_W_MIN) / (DEBT_DAYS - 1));

export function debtLevel(minutes: number): DebtLevel {
  if (minutes < DEBT_LOW_MAX) return 'low';
  if (minutes < DEBT_MID_MAX) return 'medium';
  return 'high';
}

function sumContributions(slept: number[], need: number): { total: number; items: { delta: number; w: number; c: number }[] } {
  const items = slept.map((s, i) => {
    const delta = need - s;
    const w = weightFor(i);
    const c = delta > 0 ? w * delta : w * delta * SURPLUS_FACTOR;
    return { delta, w, c };
  });
  return { total: items.reduce((a, b) => a + b.c, 0), items };
}

export interface DebtOptions {
  /** wake date (YYYY-MM-DD) of the most recent night; defaults to the local date of `now` */
  refDate?: string;
  shiftMode?: boolean;
}

/** Weighted 14-night sleep debt (5.3). */
export function computeDebt(
  sessions: SleepSession[],
  need: number,
  tz: string,
  now: number,
  opts: DebtOptions = {},
): DebtResult {
  const ref = opts.refDate ?? dateKey(now, tz);
  const days = buildSleepDays(sessions, tz, opts.shiftMode ?? false);
  const dates = Array.from({ length: DEBT_DAYS }, (_, i) => addDaysToKey(ref, -i));
  const observed: (number | null)[] = dates.map((d) => {
    const day = days.get(d);
    if (!day || day.main.length === 0) return null;
    return day.mainMinutes + NAP_WEIGHT * day.napMinutes;
  });
  const known = observed.filter((v): v is number => v !== null);
  const missingCount = DEBT_DAYS - known.length;
  const fill = known.length ? median(known) : need;
  const slept = observed.map((v) => (v === null ? fill : v));
  const { total, items } = sumContributions(slept, need);
  const nights: DebtNight[] = dates.map((date, i) => ({
    date,
    index: i,
    sleptMinutes: slept[i],
    estimated: observed[i] === null,
    deltaMinutes: items[i].delta,
    weight: items[i].w,
    contributionMinutes: items[i].c,
  }));
  const debtMinutes = Math.max(0, total);
  const insufficientData = missingCount > DEBT_MAX_MISSING;
  let range: [number, number] | null = null;
  if (insufficientData && known.length > 0) {
    const lo = Math.max(...known, need);
    const hi = Math.min(...known);
    const a = Math.max(0, sumContributions(observed.map((v) => (v === null ? lo : v)), need).total);
    const b = Math.max(0, sumContributions(observed.map((v) => (v === null ? hi : v)), need).total);
    range = [Math.min(a, b), Math.max(a, b)];
  }
  return { debtMinutes, level: debtLevel(debtMinutes), nights, missingCount, insufficientData, range };
}

export interface DebtForecast {
  /** projected debt on the morning after the simulated night */
  debtMinutes: number;
  reductionMinutes: number;
}

/**
 * Simulate the coming night: go to bed at `bedtime`, fall asleep after the onset delay and
 * wake at `wakeAt`. Returns projected debt the next morning.
 */
export function forecastDebt(
  sessions: SleepSession[],
  need: number,
  tz: string,
  now: number,
  bedtime: number,
  wakeAt: number,
): DebtForecast {
  const current = computeDebt(sessions, need, tz, now).debtMinutes;
  const sim: SleepSession = {
    id: 'forecast',
    startAt: bedtime + SLEEP_ONSET_MIN * MIN,
    endAt: wakeAt,
    asleepMinutes: null,
    source: 'manual',
    confidence: 1,
    isNap: false,
    timezone: tz,
    userEdited: true,
  };
  const refDate = dateKey(wakeAt, tz);
  const next = computeDebt([...sessions, sim], need, tz, wakeAt, { refDate }).debtMinutes;
  return { debtMinutes: next, reductionMinutes: current - next };
}
