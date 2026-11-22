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
  /** Hook for subclasses that persist the data (called after each mutation). */
  protected changed(): void {}

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
    this.changed();
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
    this.changed();
  }
  async deleteSession(id: string) {
    this.sessions.delete(id);
    this.changed();
  }
  async clearSessions(source?: SleepSession['source']) {
    for (const [id, s] of this.sessions) if (!source || s.source === source) this.sessions.delete(id);
    this.changed();
  }
  async listHabits() {
    return [...this.habits.values()].map((h) => ({ ...h }));
  }
  async saveHabit(h: Habit) {
    this.habits.set(h.key, { ...h });
    this.changed();
  }
  async listHabitLogs(sinceDate?: string) {
    return [...this.logs.values()].filter((l) => !sinceDate || l.date >= sinceDate).map((l) => ({ ...l }));
  }
  async setHabitLog(log: HabitLog) {
    this.logs.set(`${log.habitKey}|${log.date}`, { ...log });
    this.changed();
  }
  async removeHabitLog(habitKey: HabitKey, date: string) {
    this.logs.delete(`${habitKey}|${date}`);
    this.changed();
  }
  async listCheckins() {
    return [...this.checkins.values()].sort((a, b) => a.at - b.at).map((c) => ({ ...c }));
  }
  async addCheckin(c: EnergyCheckin) {
    if (!this.checkins.has(c.id)) this.checkins.set(c.id, { ...c });
    this.changed();
  }
  async getSummary(date: string) {
    const s = this.summaries.get(date);
    return s ? { ...s } : null;
  }
  async saveSummary(s: DailySummary) {
    this.summaries.set(s.date, { ...s });
    this.changed();
  }
  async clearSummaries() {
    this.summaries.clear();
    this.changed();
  }
  async getSetting(key: string) {
    return this.settings.get(key) ?? null;
  }
  async setSetting(key: string, value: string) {
    this.settings.set(key, value);
    this.changed();
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
  /** Everything, including settings, as JSON (for web persistence). */
  serialize(): string {
    return JSON.stringify({
      profile: this.profile,
      sessions: [...this.sessions.values()],
      habits: [...this.habits.values()],
      logs: [...this.logs.values()],
      checkins: [...this.checkins.values()],
      settings: [...this.settings.entries()],
    });
  }

  restore(json: string): void {
    const d = JSON.parse(json);
    this.profile = d.profile ?? null;
    this.sessions = new Map((d.sessions ?? []).map((x: SleepSession) => [x.id, x]));
    this.habits = new Map((d.habits ?? []).map((x: Habit) => [x.key, x]));
    this.logs = new Map((d.logs ?? []).map((x: HabitLog) => [`${x.habitKey}|${x.date}`, x]));
    this.checkins = new Map((d.checkins ?? []).map((x: EnergyCheckin) => [x.id, x]));
    this.settings = new Map(d.settings ?? []);
  }

  async wipe() {
    this.profile = null;
    this.sessions.clear();
    this.habits.clear();
    this.logs.clear();
    this.checkins.clear();
    this.summaries.clear();
    this.settings.clear();
    this.changed();
  }
}
