import type { SleepSession } from '@/engine/types';
import { MERGE_GAP_MIN, MIN } from '@/engine/constants';
import type { RawSleepSample } from './types';

type Source = 'healthkit' | 'healthconnect';

interface Interval {
  start: number;
  end: number;
}

function mergeIntervals(list: Interval[], gap: number): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end + gap) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

const length = (list: Interval[]) => list.reduce((a, b) => a + (b.end - b.start), 0);

/**
 * Turn raw health samples into sleep sessions (6).
 * "asleep" samples form sessions (merged across gaps of at most 45 min), "inBed" samples
 * frame them, and "awake" samples are ignored (wakefulness stays out of asleepMinutes).
 * Samples are grouped by source so that duplicates from several apps can be resolved later.
 */
export function samplesToSessions(
  samples: RawSleepSample[],
  opts: { source: Source; timezone: string; now?: number },
): SleepSession[] {
  const bySource = new Map<string, RawSleepSample[]>();
  for (const s of samples) {
    const key = s.sourceName ?? 'unknown';
    const arr = bySource.get(key) ?? [];
    arr.push(s);
    bySource.set(key, arr);
  }
  const out: SleepSession[] = [];
  const now = opts.now ?? Date.now();
  for (const [name, list] of bySource) {
    const asleep: Interval[] = [];
    const inBed: Interval[] = [];
    for (const s of list) {
      const start = Date.parse(s.startDate);
      const end = Date.parse(s.endDate);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      if (s.value === 'ASLEEP') asleep.push({ start, end });
      else if (s.value === 'INBED') inBed.push({ start, end });
    }
    const frames = mergeIntervals(inBed, MERGE_GAP_MIN * MIN);
    // If a source only reports "in bed", treat it as sleep (with lower confidence).
    const onlyInBed = asleep.length === 0;
    const basis = mergeIntervals(onlyInBed ? inBed : asleep, MERGE_GAP_MIN * MIN);
    for (const group of basis) {
      const parts = (onlyInBed ? inBed : asleep).filter((p) => p.start >= group.start && p.end <= group.end);
      const asleepMs = onlyInBed ? group.end - group.start : length(mergeIntervals(parts, 0));
      const frame = onlyInBed ? undefined : frames.find((f) => f.start <= group.end && f.end >= group.start);
      const start = frame ? Math.min(frame.start, group.start) : group.start;
      const end = frame ? Math.max(frame.end, group.end) : group.end;
      if (end > now + MIN) continue;
      out.push({
        id: `${opts.source === 'healthkit' ? 'hk' : 'hc'}-${name}-${group.start}`,
        startAt: start,
        endAt: end,
        asleepMinutes: Math.round(asleepMs / MIN),
        source: opts.source,
        sourceDetail: name === 'unknown' ? null : name,
        confidence: onlyInBed ? 0.5 : 0.9,
        isNap: false,
        timezone: opts.timezone,
        userEdited: false,
      });
    }
  }
  return out.sort((a, b) => a.startAt - b.startAt);
}

/** Health Connect sleep stage codes that count as asleep. */
const HC_ASLEEP_STAGES = new Set([2, 4, 5, 6]);

export interface HealthConnectSleepRecord {
  startTime: string;
  endTime: string;
  stages?: { startTime: string; endTime: string; stage: number }[];
  metadata?: { dataOrigin?: string };
}

export function healthConnectToSessions(
  records: HealthConnectSleepRecord[],
  timezone: string,
): SleepSession[] {
  const out: SleepSession[] = [];
  for (const r of records) {
    const start = Date.parse(r.startTime);
    const end = Date.parse(r.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    let asleepMs = end - start;
    if (r.stages && r.stages.length) {
      asleepMs = r.stages
        .filter((s) => HC_ASLEEP_STAGES.has(s.stage))
        .reduce((a, s) => a + Math.max(0, Date.parse(s.endTime) - Date.parse(s.startTime)), 0);
    }
    out.push({
      id: `hc-${r.metadata?.dataOrigin ?? 'unknown'}-${start}`,
      startAt: start,
      endAt: end,
      asleepMinutes: Math.round(asleepMs / MIN),
      source: 'healthconnect',
      sourceDetail: r.metadata?.dataOrigin ?? null,
      confidence: r.stages && r.stages.length ? 0.9 : 0.7,
      isNap: false,
      timezone,
      userEdited: false,
    });
  }
  return out.sort((a, b) => a.startAt - b.startAt);
}
