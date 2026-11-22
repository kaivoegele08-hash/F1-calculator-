import { eq, gte, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { SleepSession, WorkSchedule } from '@/engine/types';
import { MIGRATIONS } from './migrations';
import * as t from './schema';
import {
  EXPORT_SCHEMA_VERSION,
  type AppProfile,
  type DailySummary,
  type DataStore,
  type EnergyCheckin,
  type ExportBundle,
  type Habit,
  type HabitKey,
  type HabitLog,
} from './types';

/** Any synchronous drizzle SQLite database (expo-sqlite or better-sqlite3). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SyncDb = BaseSQLiteDatabase<'sync', any, any>;

export function runMigrations(db: SyncDb): void {
  db.run(sql`CREATE TABLE IF NOT EXISTS migration_log (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)`);
  const applied = new Set(db.select().from(t.migrationLog).all().map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    for (const stmt of m.statements) db.run(sql.raw(stmt));
    db.insert(t.migrationLog).values({ version: m.version, appliedAt: Date.now() }).run();
  }
}

const rowToSession = (r: typeof t.sleepSession.$inferSelect): SleepSession => ({
  id: r.id,
  startAt: r.startAt,
  endAt: r.endAt,
  asleepMinutes: r.asleepMinutes,
  source: r.source as SleepSession['source'],
  sourceDetail: r.sourceDetail,
  confidence: r.confidence,
  isNap: r.isNap,
  timezone: r.timezone,
  userEdited: r.userEdited,
});

export class SqliteStore implements DataStore {
  constructor(private db: SyncDb) {
    runMigrations(db);
  }

  async getProfile(): Promise<AppProfile | null> {
    const r = this.db.select().from(t.profile).where(eq(t.profile.id, 1)).get();
    if (!r) return null;
    return {
      createdAt: r.createdAt,
      name: r.name,
      birthYear: r.birthYear,
      sleepNeedMinutesManual: r.sleepNeedMinutesManual,
      sleepNeedMinutesEstimated: r.sleepNeedMinutesEstimated,
      chronotype: r.chronotype as AppProfile['chronotype'],
      chronotypeScore: r.chronotypeScore,
      circadianPhaseOffsetMin: r.circadianPhaseOffsetMin,
      chronotypeUpdatedAt: r.chronotypeUpdatedAt,
      targetWakeTime: r.targetWakeTime,
      workSchedule: JSON.parse(r.workSchedule) as WorkSchedule,
      caffeineCutoffHours: r.caffeineCutoffHours,
      timezone: r.timezone,
      onboardingCompletedAt: r.onboardingCompletedAt,
    };
  }

  async saveProfile(p: AppProfile): Promise<void> {
    const values = {
      id: 1,
      createdAt: p.createdAt,
      name: p.name ?? null,
      birthYear: p.birthYear ?? null,
      sleepNeedMinutesManual: p.sleepNeedMinutesManual ?? null,
      sleepNeedMinutesEstimated: p.sleepNeedMinutesEstimated ?? null,
      chronotype: p.chronotype,
      chronotypeScore: p.chronotypeScore,
      circadianPhaseOffsetMin: p.circadianPhaseOffsetMin,
      chronotypeUpdatedAt: p.chronotypeUpdatedAt ?? null,
      targetWakeTime: p.targetWakeTime ?? null,
      workSchedule: JSON.stringify(p.workSchedule),
      caffeineCutoffHours: p.caffeineCutoffHours,
      timezone: p.timezone,
      onboardingCompletedAt: p.onboardingCompletedAt ?? null,
    };
    this.db.insert(t.profile).values(values).onConflictDoUpdate({ target: t.profile.id, set: values }).run();
  }

  async listSessions(): Promise<SleepSession[]> {
    return this.db.select().from(t.sleepSession).orderBy(t.sleepSession.startAt).all().map(rowToSession);
  }

  async getSession(id: string): Promise<SleepSession | null> {
    const r = this.db.select().from(t.sleepSession).where(eq(t.sleepSession.id, id)).get();
    return r ? rowToSession(r) : null;
  }

  async upsertSessions(sessions: SleepSession[]): Promise<void> {
    const now = Date.now();
    this.db.transaction((tx) => {
      for (const s of sessions) {
        const values = {
          id: s.id,
          startAt: s.startAt,
          endAt: s.endAt,
          asleepMinutes: s.asleepMinutes ?? null,
          source: s.source,
          sourceDetail: s.sourceDetail ?? null,
          confidence: s.confidence,
          isNap: s.isNap,
          timezone: s.timezone,
          userEdited: s.userEdited,
          createdAt: now,
          updatedAt: now,
        };
        const { createdAt: _c, id: _i, ...update } = values;
        void _c;
        void _i;
        tx.insert(t.sleepSession).values(values).onConflictDoUpdate({ target: t.sleepSession.id, set: update }).run();
      }
    });
  }

  async deleteSession(id: string): Promise<void> {
    this.db.delete(t.sleepSession).where(eq(t.sleepSession.id, id)).run();
  }

  async clearSessions(source?: SleepSession['source']): Promise<void> {
    if (source) this.db.delete(t.sleepSession).where(eq(t.sleepSession.source, source)).run();
    else this.db.delete(t.sleepSession).run();
  }

  async listHabits(): Promise<Habit[]> {
    return this.db.select().from(t.habit).all().map((r) => ({
      key: r.key as HabitKey,
      enabled: r.enabled,
      reminderEnabled: r.reminderEnabled,
      reminderOffsetMin: r.reminderOffsetMin,
    }));
  }

  async saveHabit(h: Habit): Promise<void> {
    this.db.insert(t.habit).values(h).onConflictDoUpdate({ target: t.habit.key, set: h }).run();
  }

  async listHabitLogs(sinceDate?: string): Promise<HabitLog[]> {
    const q = this.db.select().from(t.habitLog);
    const rows = sinceDate ? q.where(gte(t.habitLog.date, sinceDate)).all() : q.all();
    return rows.map((r) => ({
      habitKey: r.habitKey as HabitKey,
      date: r.date,
      status: r.status as HabitLog['status'],
      at: r.at,
    }));
  }

  async setHabitLog(log: HabitLog): Promise<void> {
    this.db
      .insert(t.habitLog)
      .values(log)
      .onConflictDoUpdate({ target: [t.habitLog.habitKey, t.habitLog.date], set: { status: log.status, at: log.at } })
      .run();
  }

  async removeHabitLog(habitKey: HabitKey, date: string): Promise<void> {
    this.db.delete(t.habitLog).where(sql`${t.habitLog.habitKey} = ${habitKey} AND ${t.habitLog.date} = ${date}`).run();
  }

  async listCheckins(): Promise<EnergyCheckin[]> {
    return this.db.select().from(t.energyCheckin).orderBy(t.energyCheckin.at).all();
  }

  async addCheckin(c: EnergyCheckin): Promise<void> {
    this.db
      .insert(t.energyCheckin)
      .values({ id: c.id, at: c.at, rating: c.rating, note: c.note ?? null })
      .onConflictDoNothing()
      .run();
  }

  async getSummary(date: string): Promise<DailySummary | null> {
    return this.db.select().from(t.dailySummary).where(eq(t.dailySummary.date, date)).get() ?? null;
  }

  async saveSummary(s: DailySummary): Promise<void> {
    this.db.insert(t.dailySummary).values(s).onConflictDoUpdate({ target: t.dailySummary.date, set: s }).run();
  }

  async clearSummaries(): Promise<void> {
    this.db.delete(t.dailySummary).run();
  }

  async getSetting(key: string): Promise<string | null> {
    return this.db.select().from(t.setting).where(eq(t.setting.key, key)).get()?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.db.insert(t.setting).values({ key, value }).onConflictDoUpdate({ target: t.setting.key, set: { value } }).run();
  }

  async exportAll(): Promise<ExportBundle> {
    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: Date.now(),
      profile: await this.getProfile(),
      sessions: await this.listSessions(),
      habits: await this.listHabits(),
      habitLogs: await this.listHabitLogs(),
      checkins: await this.listCheckins(),
    };
  }

  async wipe(): Promise<void> {
    this.db.transaction((tx) => {
      for (const table of [t.profile, t.sleepSession, t.dailySummary, t.habit, t.habitLog, t.energyCheckin, t.setting]) {
        tx.delete(table).run();
      }
    });
  }
}
