import { addDaysToKey, localTimeToMs } from '../time';
import type { Profile, SleepSession } from '../types';

export const TZ = 'Europe/Berlin';

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    name: 'Test',
    birthYear: 1990,
    sleepNeedMinutesManual: null,
    sleepNeedMinutesEstimated: null,
    chronotype: 'intermediate',
    chronotypeScore: 0,
    circadianPhaseOffsetMin: 0,
    targetWakeTime: null,
    workSchedule: { workDays: [1, 2, 3, 4, 5], workStart: '09:00', workEnd: '17:00', shiftMode: false },
    caffeineCutoffHours: 8,
    timezone: TZ,
    ...over,
  };
}

let counter = 0;
/** A night that starts on the evening of `bedDateKey` at `bed` and ends the next morning at `wake`. */
export function night(
  wakeDateKey: string,
  bed: string,
  wake: string,
  over: Partial<SleepSession> = {},
  tz = TZ,
): SleepSession {
  const [bh] = bed.split(':').map(Number);
  const bedKey = bh >= 12 ? addDaysToKey(wakeDateKey, -1) : wakeDateKey;
  return {
    id: `n${counter++}`,
    startAt: localTimeToMs(bedKey, bed, tz),
    endAt: localTimeToMs(wakeDateKey, wake, tz),
    asleepMinutes: null,
    source: 'demo',
    confidence: 1,
    isNap: false,
    timezone: tz,
    userEdited: false,
    ...over,
  };
}

/** A session that starts and ends on the same local date. */
export function nap(dateKey: string, start: string, end: string, over: Partial<SleepSession> = {}): SleepSession {
  return {
    id: `p${counter++}`,
    startAt: localTimeToMs(dateKey, start, TZ),
    endAt: localTimeToMs(dateKey, end, TZ),
    asleepMinutes: null,
    source: 'demo',
    confidence: 1,
    isNap: false,
    timezone: TZ,
    userEdited: false,
    ...over,
  };
}

/** Sleep of constant duration `minutes`, waking at `wake` on every one of the last `days` days. */
export function constantNights(lastWakeKey: string, days: number, minutes: number, wake = '07:00'): SleepSession[] {
  const out: SleepSession[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDaysToKey(lastWakeKey, -i);
    const endAt = localTimeToMs(key, wake, TZ);
    out.push({
      id: `c${counter++}`,
      startAt: endAt - minutes * 60_000,
      endAt,
      asleepMinutes: null,
      source: 'demo',
      confidence: 1,
      isNap: false,
      timezone: TZ,
      userEdited: false,
    });
  }
  return out;
}
