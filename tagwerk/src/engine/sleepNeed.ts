import {
  NEED_DEFAULT_18_25,
  NEED_DEFAULT_ADULT,
  NEED_DEFAULT_UNDER_18,
  NEED_LATE_WAKE_HOUR,
  NEED_LOOKBACK_DAYS,
  NEED_MAX,
  NEED_MIN,
  NEED_MIN_NIGHTS,
  NEED_RECOVERY_MAX_DEBT_MIN,
  NEED_RECOVERY_MIN_NIGHTS,
  NEED_SMOOTH_NEW,
  NEED_SMOOTH_OLD,
} from './constants';
import { computeDebt } from './sleepDebt';
import { buildSleepDays } from './sleepDetection';
import { addDaysToKey, dateKey, dayOfWeekOfKey, hourOfDay, median, percentile } from './time';
import type { Profile, SleepSession } from './types';

export function defaultNeedMinutes(birthYear: number | null | undefined, now: number): number {
  if (!birthYear) return NEED_DEFAULT_ADULT;
  const age = new Date(now).getUTCFullYear() - birthYear;
  if (age < 18) return NEED_DEFAULT_UNDER_18;
  if (age <= 25) return NEED_DEFAULT_18_25;
  return NEED_DEFAULT_ADULT;
}

export interface SleepNeedResult {
  minutes: number;
  /** 'manual' | 'estimated' | 'default' */
  basis: 'manual' | 'estimated' | 'default';
  /** nights the estimate is based on */
  nights: number;
  recoveryNights: number;
  /** raw measurement before smoothing, if any */
  measured: number | null;
}

const clampNeed = (m: number) => Math.min(NEED_MAX, Math.max(NEED_MIN, m));

/**
 * Estimate individual sleep need (5.2). Manual override always wins; with fewer than
 * 14 nights the default applies.
 */
export function estimateSleepNeed(
  sessions: SleepSession[],
  profile: Profile,
  now: number,
): SleepNeedResult {
  const tz = profile.timezone;
  const dflt = defaultNeedMinutes(profile.birthYear, now);
  if (profile.sleepNeedMinutesManual != null) {
    return { minutes: clampNeed(profile.sleepNeedMinutesManual), basis: 'manual', nights: 0, recoveryNights: 0, measured: null };
  }
  const prev = profile.sleepNeedMinutesEstimated ?? dflt;
  const today = dateKey(now, tz);
  const oldest = addDaysToKey(today, -NEED_LOOKBACK_DAYS);
  const days = [...buildSleepDays(sessions, tz, profile.workSchedule.shiftMode).values()]
    .filter((d) => d.main.length > 0 && d.date > oldest && d.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < NEED_MIN_NIGHTS) {
    return { minutes: clampNeed(prev), basis: 'default', nights: days.length, recoveryNights: 0, measured: null };
  }

  const ws = profile.workSchedule;
  const recovery: number[] = [];
  for (const d of days) {
    // Debt before that night, using the previous need estimate and only earlier data.
    const refNow = new Date(`${d.date}T00:00:00Z`).getTime();
    const before = sessions.filter((s) => s.endAt < (d.bedAt ?? refNow));
    const debt = computeDebt(before, prev, tz, (d.bedAt ?? refNow), { refDate: addDaysToKey(d.date, -1) });
    if (debt.insufficientData || debt.debtMinutes >= NEED_RECOVERY_MAX_DEBT_MIN) continue;
    const dow = dayOfWeekOfKey(d.date);
    const freeDay = !ws.workDays.includes(dow) && !ws.shiftMode;
    const wakeHour = d.wakeAt != null ? hourOfDay(d.wakeAt, tz) : 0;
    if (freeDay || wakeHour >= NEED_LATE_WAKE_HOUR + 0.5) recovery.push(d.mainMinutes);
  }
  const last30 = days.filter((d) => d.date > addDaysToKey(today, -30)).map((d) => d.mainMinutes);
  const measured =
    recovery.length >= NEED_RECOVERY_MIN_NIGHTS ? median(recovery) : percentile(last30, 0.8);
  // The very first estimate has nothing to smooth against.
  const smoothed =
    profile.sleepNeedMinutesEstimated == null
      ? clampNeed(measured)
      : NEED_SMOOTH_OLD * prev + NEED_SMOOTH_NEW * clampNeed(measured);
  return {
    minutes: clampNeed(smoothed),
    basis: 'estimated',
    nights: days.length,
    recoveryNights: recovery.length,
    measured: clampNeed(measured),
  };
}
