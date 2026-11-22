import type { SleepSession } from '@/engine/types';
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

/** In-memory store used for the web preview and tests. */
export class MemoryStore implements DataStore {
  private profile: AppProfile | null = null;
  private sessions = new Map<string, SleepSession>();
  private habits = new Map<string, Habit>();
  private logs = new Map<string, HabitLog>();
  private checkins = new Map<string, EnergyCheckin>();
  private summaries = new Map<string, DailySummary>();
  private settings = new Map<string, string>();

  async getProfile() {
    return this.profile ? structuredClone(this.profile) : null;
  }
  async saveProfile(p: AppProfile) {
    this.profile = structuredClone(p);
  }
  async listSessions() {
    return [...this.sessions.values()].sort((a, b) => a.startAt - b.startAt).map((s) => ({ ...s }));
  }
  async getSession(id: string) {
    const s = this.sessions.get(id);
    return s ? { ...s } : null;
  }
  async upsertSessions(sessions: SleepSession[]) {
    for (const s of sessions) this.sessions.set(s.id, { ...s });
  }
  async deleteSession(id: string) {
    this.sessions.delete(id);
  }
  async clearSessions(source?: SleepSession['source']) {
    for (const [id, s] of this.sessions) if (!source || s.source === source) this.sessions.delete(id);
  }
  async listHabits() {
    return [...this.habits.values()].map((h) => ({ ...h }));
  }
  async saveHabit(h: Habit) {
    this.habits.set(h.key, { ...h });
  }
  async listHabitLogs(sinceDate?: string) {
    return [...this.logs.values()].filter((l) => !sinceDate || l.date >= sinceDate).map((l) => ({ ...l }));
  }
  async setHabitLog(log: HabitLog) {
    this.logs.set(`${log.habitKey}|${log.date}`, { ...log });
  }
  async removeHabitLog(habitKey: HabitKey, date: string) {
    this.logs.delete(`${habitKey}|${date}`);
  }
  async listCheckins() {
    return [...this.checkins.values()].sort((a, b) => a.at - b.at).map((c) => ({ ...c }));
  }
  async addCheckin(c: EnergyCheckin) {
    if (!this.checkins.has(c.id)) this.checkins.set(c.id, { ...c });
  }
  async getSummary(date: string) {
    const s = this.summaries.get(date);
    return s ? { ...s } : null;
  }
  async saveSummary(s: DailySummary) {
    this.summaries.set(s.date, { ...s });
  }
  async clearSummaries() {
    this.summaries.clear();
  }
  async getSetting(key: string) {
    return this.settings.get(key) ?? null;
  }
  async setSetting(key: string, value: string) {
    this.settings.set(key, value);
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
  async wipe() {
    this.profile = null;
    this.sessions.clear();
    this.habits.clear();
    this.logs.clear();
    this.checkins.clear();
    this.summaries.clear();
    this.settings.clear();
  }
}
