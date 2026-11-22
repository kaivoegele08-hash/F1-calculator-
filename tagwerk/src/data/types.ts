import type { Profile, SleepSession } from '@/engine/types';

export interface AppProfile extends Profile {
  createdAt: number;
  onboardingCompletedAt: number | null;
  /** when the learned chronotype offset was last updated */
  chronotypeUpdatedAt: number | null;
}

export type HabitKey =
  | 'morning_light'
  | 'caffeine_cutoff'
  | 'no_alcohol'
  | 'last_meal'
  | 'dim_light'
  | 'wind_down'
  | 'bedtime'
  | 'bedroom_check'
  | 'powernap';

export interface Habit {
  key: HabitKey;
  enabled: boolean;
  reminderEnabled: boolean;
  /** minutes relative to the habit's window start (negative = before) */
  reminderOffsetMin: number;
}

export type HabitStatus = 'done' | 'skipped';

export interface HabitLog {
  habitKey: HabitKey;
  /** YYYY-MM-DD */
  date: string;
  status: HabitStatus;
  at: number;
}

export interface EnergyCheckin {
  id: string;
  at: number;
  rating: number;
  note?: string | null;
}

export interface DailySummary {
  date: string;
  totalSleepMinutes: number;
  napMinutes: number;
  sleepDebtMinutes: number;
  sleepNeedMinutes: number;
  energyCurveJson: string;
  windowsJson: string;
  computedAt: number;
  engineVersion: number;
}

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportBundle {
  schemaVersion: number;
  exportedAt: number;
  profile: AppProfile | null;
  sessions: SleepSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  checkins: EnergyCheckin[];
}

export interface ImportPreview {
  nightsFound: number;
  duplicatesSkipped: number;
  newSessions: SleepSession[];
}

export interface DataStore {
  getProfile(): Promise<AppProfile | null>;
  saveProfile(p: AppProfile): Promise<void>;

  listSessions(): Promise<SleepSession[]>;
  getSession(id: string): Promise<SleepSession | null>;
  upsertSessions(sessions: SleepSession[]): Promise<void>;
  deleteSession(id: string): Promise<void>;
  /** delete all sessions from a source, or all if omitted */
  clearSessions(source?: SleepSession['source']): Promise<void>;

  listHabits(): Promise<Habit[]>;
  saveHabit(h: Habit): Promise<void>;
  listHabitLogs(sinceDate?: string): Promise<HabitLog[]>;
  setHabitLog(log: HabitLog): Promise<void>;
  removeHabitLog(habitKey: HabitKey, date: string): Promise<void>;

  listCheckins(): Promise<EnergyCheckin[]>;
  addCheckin(c: EnergyCheckin): Promise<void>;

  getSummary(date: string): Promise<DailySummary | null>;
  saveSummary(s: DailySummary): Promise<void>;
  clearSummaries(): Promise<void>;

  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  exportAll(): Promise<ExportBundle>;
  wipe(): Promise<void>;
}
