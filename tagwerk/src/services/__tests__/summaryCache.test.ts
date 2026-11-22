import { MemoryStore } from '@/data/memoryStore';
import { computeDayPlan } from '@/engine/dayPlan';
import { ENGINE_VERSION } from '@/engine/constants';
import { constantNights, makeProfile, nap, TZ } from '@/engine/__tests__/fixtures';
import { localTimeToMs } from '@/engine/time';
import { cacheSummary, toSummary } from '../summaryCache';

const now = localTimeToMs('2025-05-14', '15:00', TZ);
const profile = makeProfile();
const sessions = [...constantNights('2025-05-14', 20, 450), nap('2025-05-14', '14:00', '14:30')];
const plan = computeDayPlan({ sessions, profile, now });

describe('daily summary cache', () => {
  it('summarises the day', () => {
    const s = toSummary(plan, sessions, profile, now);
    expect(s.date).toBe('2025-05-14');
    expect(s.totalSleepMinutes).toBe(450);
    expect(s.napMinutes).toBe(30);
    expect(s.engineVersion).toBe(ENGINE_VERSION);
    expect(JSON.parse(s.energyCurveJson).length).toBeGreaterThan(200);
    expect(JSON.parse(s.windowsJson).length).toBeGreaterThan(8);
  });

  it('writes once, reuses a fresh row and recomputes after an engine version change', async () => {
    const store = new MemoryStore();
    expect(await cacheSummary(store, plan, sessions, profile, now)).toBe('written');
    expect(await cacheSummary(store, plan, sessions, profile, now)).toBe('fresh');
    const row = await store.getSummary('2025-05-14');
    await store.saveSummary({ ...row!, engineVersion: ENGINE_VERSION - 1 });
    expect(await cacheSummary(store, plan, sessions, profile, now)).toBe('written');
    expect((await store.getSummary('2025-05-14'))?.engineVersion).toBe(ENGINE_VERSION);
    await store.clearSummaries();
    expect(await cacheSummary(store, plan, sessions, profile, now)).toBe('written');
  });

  it('handles days without sleep data', () => {
    const empty = computeDayPlan({ sessions: [], profile, now });
    const s = toSummary(empty, [], profile, now);
    expect(s.totalSleepMinutes).toBe(0);
  });
});
