import { HOUR, MERGE_GAP_MIN, MIN, NAP_END_HOUR, NAP_MAX_MIN, NAP_START_HOUR } from './constants';
import { dateKey, hourOfDay } from './time';
import type { SleepSession } from './types';

/** Source priority (5.1): userEdited > wearable > phone estimate > manual quick entry. */
export function sourcePriority(s: SleepSession): number {
  if (s.userEdited) return 4;
  if (s.source === 'healthkit' || s.source === 'healthconnect') {
    return /iphone|phone|handy|smartphone/i.test(s.sourceDetail ?? '') ? 2 : 3;
  }
  if (s.source === 'demo') return 3;
  if (s.source === 'phone_inferred') return 2;
  return 1;
}

const durMin = (s: { startAt: number; endAt: number }) => (s.endAt - s.startAt) / MIN;

function overlapMs(a: SleepSession, b: SleepSession): number {
  return Math.max(0, Math.min(a.endAt, b.endAt) - Math.max(a.startAt, b.startAt));
}

/** Drop sessions that are mostly covered by a higher-priority source. */
export function dedupeBySource(sessions: SleepSession[]): SleepSession[] {
  const valid = sessions.filter((s) => s.endAt > s.startAt);
  return valid.filter((s) => {
    const own = s.endAt - s.startAt;
    return !valid.some(
      (o) => o !== s && sourcePriority(o) > sourcePriority(s) && overlapMs(s, o) >= own * 0.5,
    );
  });
}

function unionMs(parts: SleepSession[]): number {
  const sorted = [...parts].sort((a, b) => a.startAt - b.startAt);
  let total = 0;
  let curStart = sorted[0].startAt;
  let curEnd = sorted[0].endAt;
  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.startAt <= curEnd) curEnd = Math.max(curEnd, p.endAt);
    else {
      total += curEnd - curStart;
      curStart = p.startAt;
      curEnd = p.endAt;
    }
  }
  return total + (curEnd - curStart);
}

function combine(parts: SleepSession[]): SleepSession {
  if (parts.length === 1) return parts[0];
  const best = parts.reduce((a, b) => (sourcePriority(b) > sourcePriority(a) ? b : a));
  const union = unionMs(parts) / MIN;
  let knownAsleep = 0;
  let knownDur = 0;
  for (const p of parts) {
    if (p.asleepMinutes != null) {
      knownAsleep += p.asleepMinutes;
      knownDur += durMin(p);
    }
  }
  const ratio = knownDur > 0 ? Math.min(1, knownAsleep / knownDur) : 1;
  return {
    ...best,
    id: parts[0].id,
    startAt: Math.min(...parts.map((p) => p.startAt)),
    endAt: Math.max(...parts.map((p) => p.endAt)),
    asleepMinutes: Math.round(union * ratio),
    confidence: Math.min(...parts.map((p) => p.confidence)),
    userEdited: parts.some((p) => p.userEdited),
    isNap: best.isNap,
  };
}

/** Merge overlapping sessions or ones separated by at most `gapMin` minutes awake. */
export function mergeSessions(sessions: SleepSession[], gapMin = MERGE_GAP_MIN): SleepSession[] {
  const sorted = [...sessions].filter((s) => s.endAt > s.startAt).sort((a, b) => a.startAt - b.startAt);
  const groups: SleepSession[][] = [];
  let curEnd = -Infinity;
  for (const s of sorted) {
    if (groups.length && s.startAt <= curEnd + gapMin * MIN) {
      groups[groups.length - 1].push(s);
      curEnd = Math.max(curEnd, s.endAt);
    } else {
      groups.push([s]);
      curEnd = s.endAt;
    }
  }
  return groups.map(combine);
}

/** Nap = < 3 h and starting between 09:00 and 20:00 local (shift mode: relative to main sleep). */
export function classifyNaps(
  merged: SleepSession[],
  tz: string,
  shiftMode = false,
): SleepSession[] {
  const longOnes = merged.filter((s) => durMin(s) >= NAP_MAX_MIN);
  return merged.map((s) => {
    if (s.userEdited) return s;
    const dur = durMin(s);
    let nap = false;
    if (dur < NAP_MAX_MIN) {
      if (shiftMode) {
        const prev = [...longOnes].reverse().find((l) => l.endAt <= s.startAt);
        const next = longOnes.find((l) => l.startAt >= s.endAt);
        const afterPrev = prev ? s.startAt - prev.endAt >= 2 * HOUR : false;
        const beforeNext = next ? next.startAt - s.endAt >= 3 * HOUR : prev ? s.startAt - prev.endAt >= 4 * HOUR : false;
        nap = afterPrev && beforeNext;
      } else {
        const h = hourOfDay(s.startAt, s.timezone || tz);
        nap = h >= NAP_START_HOUR && h < NAP_END_HOUR;
      }
    }
    return { ...s, isNap: nap };
  });
}

export interface SleepDay {
  /** Local date of waking, YYYY-MM-DD */
  date: string;
  mainMinutes: number;
  napMinutes: number;
  main: SleepSession[];
  naps: SleepSession[];
  /** earliest start of main sleep and latest end (UTC ms) */
  bedAt: number | null;
  wakeAt: number | null;
}

export const asleepOf = (s: SleepSession): number =>
  s.asleepMinutes != null ? s.asleepMinutes : durMin(s);

/** Full pipeline: dedupe -> merge -> nap classification -> grouping by wake date. */
export function buildSleepDays(
  raw: SleepSession[],
  tz: string,
  shiftMode = false,
): Map<string, SleepDay> {
  const merged = classifyNaps(mergeSessions(dedupeBySource(raw)), tz, shiftMode);
  const days = new Map<string, SleepDay>();
  for (const s of merged) {
    const key = dateKey(s.endAt, tz);
    let d = days.get(key);
    if (!d) {
      d = { date: key, mainMinutes: 0, napMinutes: 0, main: [], naps: [], bedAt: null, wakeAt: null };
      days.set(key, d);
    }
    if (s.isNap) {
      d.naps.push(s);
      d.napMinutes += asleepOf(s);
    } else {
      d.main.push(s);
      d.mainMinutes += asleepOf(s);
      d.bedAt = d.bedAt == null ? s.startAt : Math.min(d.bedAt, s.startAt);
      d.wakeAt = d.wakeAt == null ? s.endAt : Math.max(d.wakeAt, s.endAt);
    }
  }
  return days;
}

/** All merged main-sleep and nap intervals, for sleep-pressure simulation. */
export function sleepIntervals(raw: SleepSession[], tz: string, shiftMode = false): SleepSession[] {
  return classifyNaps(mergeSessions(dedupeBySource(raw)), tz, shiftMode);
}
