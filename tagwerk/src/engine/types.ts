export type SleepSource = 'healthkit' | 'healthconnect' | 'manual' | 'phone_inferred' | 'demo';
export type Chronotype = 'early' | 'intermediate' | 'late';

export interface SleepSession {
  id: string;
  /** UTC ms */
  startAt: number;
  endAt: number;
  /** Minutes actually asleep, if known. */
  asleepMinutes?: number | null;
  source: SleepSource;
  sourceDetail?: string | null;
  confidence: number;
  isNap: boolean;
  timezone: string;
  userEdited: boolean;
}

export interface WorkSchedule {
  /** 0 = Sunday … 6 = Saturday */
  workDays: number[];
  /** "HH:mm" */
  workStart: string;
  workEnd: string;
  shiftMode: boolean;
}

export interface Profile {
  name?: string | null;
  birthYear?: number | null;
  sleepNeedMinutesManual?: number | null;
  sleepNeedMinutesEstimated?: number | null;
  chronotype: Chronotype;
  chronotypeScore: number;
  circadianPhaseOffsetMin: number;
  /** "HH:mm" */
  targetWakeTime?: string | null;
  workSchedule: WorkSchedule;
  caffeineCutoffHours: number;
  timezone: string;
}

export type DebtLevel = 'low' | 'medium' | 'high';

export interface Interval {
  start: number;
  end: number;
}

export type WindowKind =
  | 'grogginess'
  | 'morning_light'
  | 'morning_peak'
  | 'caffeine_stop'
  | 'afternoon_dip'
  | 'nap'
  | 'evening_peak'
  | 'sport'
  | 'last_meal'
  | 'dim_light'
  | 'wind_down'
  | 'melatonin'
  | 'bedtime';

export interface DayWindow extends Interval {
  kind: WindowKind;
  /** point-in-time events have start === end */
  point: boolean;
}

export interface CurvePoint {
  t: number;
  /** 0..100 */
  energy: number;
}

export interface CurveFeatures {
  grogginessEnd: number;
  morningPeak: Interval;
  afternoonDip: Interval;
  eveningPeak: Interval;
  /** true when features came from heuristics instead of curve extrema */
  heuristic: boolean;
}
