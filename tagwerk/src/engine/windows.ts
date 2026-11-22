import {
  BEDTIME_EARLY_LIMIT_MIN,
  DEBT_PAYBACK_FRACTION,
  DEBT_PAYBACK_MAX_MIN,
  DIM_LIGHT_BEFORE_MELATONIN_MIN,
  HABITUAL_ONSET_REF_H,
  HOUR,
  LAST_MEAL_BEFORE_BED_H,
  MELATONIN_LENGTH_MIN,
  MIN,
  MORNING_LIGHT_MIN,
  NAP_LATEST_BEFORE_BED_H,
  NAP_LONG_MIN,
  NAP_SHORT_MIN,
  SLEEP_ONSET_MIN,
  SPORT_BEFORE_WIND_DOWN_H,
  SPORT_LENGTH_MIN,
  WIND_DOWN_BEFORE_MELATONIN_MIN,
} from './constants';
import { addDaysToKey, dateKey, formatHHmm, localTimeToMs, parseHHmm } from './time';
import type { CurveFeatures, DayWindow, Interval, Profile } from './types';

/** First instant strictly after `after` whose local clock reads `hour` (fractional hours). */
export function nextClockTime(after: number, hour: number, tz: string): number {
  const key = dateKey(after, tz);
  for (let i = -1; i <= 2; i++) {
    const ms = localTimeToMs(addDaysToKey(key, i), formatHHmm(hour), tz);
    if (ms > after) return ms;
  }
  return after + 24 * HOUR;
}

export interface MelatoninWindow extends Interval {
  dlmo: number;
}

/** Melatonin window starts ~2 h after DLMO, DLMO ≈ habitual onset - 2 h (5.8). */
export function melatoninWindow(wakeAt: number, offsetMin: number, tz: string): MelatoninWindow {
  const startClock = HABITUAL_ONSET_REF_H + offsetMin / 60;
  const start = nextClockTime(wakeAt + 6 * HOUR, startClock, tz);
  return { start, end: start + MELATONIN_LENGTH_MIN * MIN, dlmo: start - 2 * HOUR };
}

export interface BedtimeResult {
  bedtime: number;
  /** projected wake-up time */
  wakeAt: number;
  hint: 'too_early' | null;
  debtPaybackMinutes: number;
}

/** Recommended bedtime (5.8). */
export function recommendBedtime(args: {
  wakeAt: number;
  profile: Profile;
  needMinutes: number;
  debtMinutes: number;
  melatonin: MelatoninWindow;
}): BedtimeResult {
  const { wakeAt, profile, needMinutes, debtMinutes, melatonin } = args;
  const tz = profile.timezone;
  const payback = Math.min(DEBT_PAYBACK_MAX_MIN, debtMinutes * DEBT_PAYBACK_FRACTION);
  let bedtime: number;
  let hint: BedtimeResult['hint'] = null;
  let wake: number;
  if (profile.targetWakeTime) {
    wake = nextClockTime(wakeAt + 8 * HOUR, parseHHmm(profile.targetWakeTime), tz);
    bedtime = wake - (needMinutes + payback + SLEEP_ONSET_MIN) * MIN;
    const floor = melatonin.start - BEDTIME_EARLY_LIMIT_MIN * MIN;
    if (bedtime < floor) {
      bedtime = floor;
      hint = 'too_early';
    }
  } else {
    bedtime = melatonin.start + ((melatonin.end - melatonin.start) / 2);
    wake = bedtime + (needMinutes + payback + SLEEP_ONSET_MIN) * MIN;
  }
  // wake follows the bedtime actually chosen
  const projectedWake = hint ? bedtime + (needMinutes + payback + SLEEP_ONSET_MIN) * MIN : wake;
  return { bedtime, wakeAt: projectedWake, hint, debtPaybackMinutes: payback };
}

export interface WindowsInput {
  wakeAt: number;
  features: CurveFeatures;
  bedtime: number;
  melatonin: MelatoninWindow;
  caffeineCutoffHours: number;
  debtMinutes: number;
}

const win = (kind: DayWindow['kind'], start: number, end: number, point = false): DayWindow => ({
  kind,
  start,
  end,
  point,
});

/** All day windows for the timeline, sorted by start (5.8). */
export function buildWindows(input: WindowsInput): DayWindow[] {
  const { wakeAt, features, bedtime, melatonin, caffeineCutoffHours } = input;
  const windDownStart = melatonin.start - WIND_DOWN_BEFORE_MELATONIN_MIN * MIN;
  const out: DayWindow[] = [];

  out.push(win('grogginess', wakeAt, features.grogginessEnd));
  out.push(win('morning_light', wakeAt, wakeAt + MORNING_LIGHT_MIN * MIN));
  out.push(win('morning_peak', features.morningPeak.start, features.morningPeak.end));

  const caffeine = bedtime - caffeineCutoffHours * HOUR;
  out.push(win('caffeine_stop', caffeine, caffeine, true));

  out.push(win('afternoon_dip', features.afternoonDip.start, features.afternoonDip.end));
  // Nap inside the dip, but not later than 7 h before bedtime.
  const dipMid = (features.afternoonDip.start + features.afternoonDip.end) / 2;
  const latestNapStart = bedtime - NAP_LATEST_BEFORE_BED_H * HOUR;
  const napStart = Math.min(dipMid - (NAP_SHORT_MIN * MIN) / 2, latestNapStart);
  if (napStart > wakeAt + 3 * HOUR) out.push(win('nap', napStart, napStart + NAP_SHORT_MIN * MIN));

  out.push(win('evening_peak', features.eveningPeak.start, features.eveningPeak.end));

  // Sport: preferably in the evening peak, finished 2 h before wind-down at the latest.
  const sportLatestEnd = windDownStart - SPORT_BEFORE_WIND_DOWN_H * HOUR;
  const sportEnd = Math.min(features.eveningPeak.end, sportLatestEnd);
  const sportStart = Math.max(features.afternoonDip.end, sportEnd - SPORT_LENGTH_MIN * MIN);
  if (sportEnd - sportStart >= 30 * MIN) out.push(win('sport', sportStart, sportEnd));

  const lastMeal = bedtime - LAST_MEAL_BEFORE_BED_H * HOUR;
  out.push(win('last_meal', lastMeal, lastMeal, true));
  const dim = melatonin.start - DIM_LIGHT_BEFORE_MELATONIN_MIN * MIN;
  out.push(win('dim_light', dim, dim, true));
  out.push(win('wind_down', windDownStart, melatonin.start));
  out.push(win('melatonin', melatonin.start, melatonin.end));
  out.push(win('bedtime', bedtime, bedtime, true));

  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Nap suggestion text helper: long nap only makes sense with a lot of debt. */
export function napLengthMinutes(debtMinutes: number): number {
  return debtMinutes > 600 ? NAP_LONG_MIN : NAP_SHORT_MIN;
}

