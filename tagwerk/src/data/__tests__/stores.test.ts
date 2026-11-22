import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { MemoryStore } from '../memoryStore';
import { SqliteStore } from '../sqliteStore';
import { applyImport, parseBundle, previewImport } from '../exchange';
import type { AppProfile, DataStore } from '../types';
import { constantNights, makeProfile } from '@/engine/__tests__/fixtures';

const appProfile = (): AppProfile => ({
  ...makeProfile({ name: 'Zelda', targetWakeTime: '07:00', sleepNeedMinutesEstimated: 492.5 }),
  createdAt: 1000,
  onboardingCompletedAt: 2000,
  chronotypeUpdatedAt: null,
});

const factories: [string, () => DataStore][] = [
  ['MemoryStore', () => new MemoryStore()],
  ['SqliteStore (drizzle + better-sqlite3)', () => new SqliteStore(drizzle(new Database(':memory:')))],
];

describe.each(factories)('%s', (_name, make) => {
  let store: DataStore;
  beforeEach(() => {
    store = make();
  });

  it('starts empty', async () => {
    expect(await store.getProfile()).toBeNull();
    expect(await store.listSessions()).toEqual([]);
    expect(await store.getSetting('x')).toBeNull();
    expect(await store.getSession('nope')).toBeNull();
  });

  it('saves and updates the profile singleton', async () => {
    await store.saveProfile(appProfile());
    const p = await store.getProfile();
    expect(p?.name).toBe('Zelda');
    expect(p?.sleepNeedMinutesEstimated).toBe(492.5);
    expect(p?.workSchedule.workDays).toEqual([1, 2, 3, 4, 5]);
    await store.saveProfile({ ...appProfile(), name: 'Link', targetWakeTime: null });
    const q = await store.getProfile();
    expect(q?.name).toBe('Link');
    expect(q?.targetWakeTime).toBeNull();
  });

  it('upserts, edits, lists in order and deletes sessions', async () => {
    const [a, b] = constantNights('2025-05-14', 2, 480);
    await store.upsertSessions([a, b]);
    let list = await store.listSessions();
    expect(list).toHaveLength(2);
    expect(list[0].startAt).toBeLessThan(list[1].startAt);
    await store.upsertSessions([{ ...a, endAt: a.endAt + 60_000, userEdited: true, isNap: true }]);
    const edited = await store.getSession(a.id);
    expect(edited?.userEdited).toBe(true);
    expect(edited?.isNap).toBe(true);
    expect(edited?.endAt).toBe(a.endAt + 60_000);
    await store.deleteSession(a.id);
    list = await store.listSessions();
    expect(list.map((s) => s.id)).toEqual([b.id]);
  });

  it('clears sessions by source or entirely', async () => {
    const [a, b] = constantNights('2025-05-14', 2, 480);
    await store.upsertSessions([a, { ...b, source: 'manual' }]);
    await store.clearSessions('demo');
    expect((await store.listSessions()).map((s) => s.source)).toEqual(['manual']);
    await store.clearSessions();
    expect(await store.listSessions()).toEqual([]);
  });

  it('stores habits and habit logs with upsert semantics', async () => {
    await store.saveHabit({ key: 'morning_light', enabled: true, reminderEnabled: true, reminderOffsetMin: 5 });
    await store.saveHabit({ key: 'morning_light', enabled: true, reminderEnabled: false, reminderOffsetMin: 10 });
    expect(await store.listHabits()).toEqual([{ key: 'morning_light', enabled: true, reminderEnabled: false, reminderOffsetMin: 10 }]);
    await store.setHabitLog({ habitKey: 'morning_light', date: '2025-05-14', status: 'done', at: 1 });
    await store.setHabitLog({ habitKey: 'morning_light', date: '2025-05-14', status: 'skipped', at: 2 });
    await store.setHabitLog({ habitKey: 'wind_down', date: '2025-05-10', status: 'done', at: 3 });
    expect(await store.listHabitLogs()).toHaveLength(2);
    expect(await store.listHabitLogs('2025-05-12')).toEqual([{ habitKey: 'morning_light', date: '2025-05-14', status: 'skipped', at: 2 }]);
    await store.removeHabitLog('morning_light', '2025-05-14');
    expect(await store.listHabitLogs('2025-05-12')).toEqual([]);
  });

  it('stores check-ins and ignores duplicates', async () => {
    await store.addCheckin({ id: 'c1', at: 5, rating: 4, note: 'gut' });
    await store.addCheckin({ id: 'c1', at: 5, rating: 1 });
    await store.addCheckin({ id: 'c0', at: 1, rating: 3 });
    const list = await store.listCheckins();
    expect(list.map((c) => c.id)).toEqual(['c0', 'c1']);
    expect(list[1].rating).toBe(4);
  });

  it('caches daily summaries', async () => {
    const s = {
      date: '2025-05-14',
      totalSleepMinutes: 450,
      napMinutes: 20,
      sleepDebtMinutes: 120,
      sleepNeedMinutes: 480,
      energyCurveJson: '[]',
      windowsJson: '[]',
      computedAt: 9,
      engineVersion: 1,
    };
    await store.saveSummary(s);
    expect(await store.getSummary('2025-05-14')).toEqual(s);
    await store.saveSummary({ ...s, sleepDebtMinutes: 60 });
    expect((await store.getSummary('2025-05-14'))?.sleepDebtMinutes).toBe(60);
    await store.clearSummaries();
    expect(await store.getSummary('2025-05-14')).toBeNull();
  });

  it('stores settings', async () => {
    await store.setSetting('k', 'v1');
    await store.setSetting('k', 'v2');
    expect(await store.getSetting('k')).toBe('v2');
  });

  it('exports everything and wipes all data', async () => {
    await store.saveProfile(appProfile());
    await store.upsertSessions(constantNights('2025-05-14', 3, 480));
    await store.saveHabit({ key: 'bedtime', enabled: true, reminderEnabled: true, reminderOffsetMin: 0 });
    await store.setHabitLog({ habitKey: 'bedtime', date: '2025-05-14', status: 'done', at: 1 });
    await store.addCheckin({ id: 'c', at: 1, rating: 5 });
    await store.setSetting('a', 'b');
    const bundle = await store.exportAll();
    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.sessions).toHaveLength(3);
    expect(bundle.profile?.name).toBe('Zelda');
    await store.wipe();
    expect(await store.getProfile()).toBeNull();
    expect(await store.listSessions()).toEqual([]);
    expect(await store.listHabits()).toEqual([]);
    expect(await store.listHabitLogs()).toEqual([]);
    expect(await store.listCheckins()).toEqual([]);
    expect(await store.getSetting('a')).toBeNull();
  });

  it('round-trips an export through validation and import, skipping duplicates', async () => {
    await store.saveProfile(appProfile());
    await store.upsertSessions(constantNights('2025-05-14', 5, 480));
    await store.saveHabit({ key: 'bedtime', enabled: true, reminderEnabled: true, reminderOffsetMin: 0 });
    const json = JSON.stringify(await store.exportAll());
    const parsed = parseBundle(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const preview = previewImport(parsed.bundle, await store.listSessions());
    expect(preview.nightsFound).toBe(5);
    expect(preview.duplicatesSkipped).toBe(5);
    const other = make();
    const res = await applyImport(other, parsed.bundle);
    expect(res.newSessions).toHaveLength(5);
    expect((await other.listSessions())).toHaveLength(5);
    expect((await other.getProfile())?.name).toBe('Zelda');
    expect(await other.listHabits()).toHaveLength(1);
    const again = await applyImport(other, parsed.bundle);
    expect(again.duplicatesSkipped).toBe(5);
    expect(await other.listSessions()).toHaveLength(5);
  });
});

describe('import validation', () => {
  it('rejects broken JSON and wrong shapes with a readable message', () => {
    const a = parseBundle('{nope');
    expect(a.ok).toBe(false);
    const b = parseBundle(JSON.stringify({ schemaVersion: 1 }));
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.error).toContain('Ungültige Datei');
    const c = parseBundle(JSON.stringify({ schemaVersion: 99, exportedAt: 1, profile: null, sessions: [], habits: [], habitLogs: [], checkins: [] }));
    expect(c.ok).toBe(false);
  });

  it('accepts an empty but valid bundle', () => {
    const r = parseBundle(JSON.stringify({ schemaVersion: 1, exportedAt: 1, profile: null, sessions: [], habits: [], habitLogs: [], checkins: [] }));
    expect(r.ok).toBe(true);
  });

  it('treats sessions with nearly identical times as duplicates', () => {
    const [s] = constantNights('2025-05-14', 1, 480);
    const bundle = { schemaVersion: 1, exportedAt: 0, profile: null, sessions: [{ ...s, id: 'other', startAt: s.startAt + 1000 }], habits: [], habitLogs: [], checkins: [] };
    const p = previewImport(bundle, [s]);
    expect(p.duplicatesSkipped).toBe(1);
    const dupInside = previewImport({ ...bundle, sessions: [s, { ...s }] }, []);
    expect(dupInside.newSessions).toHaveLength(1);
  });
});
