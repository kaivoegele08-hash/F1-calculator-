import { DEMO_SCENARIOS, demoProfile, generateDemoSessions, mulberry32 } from '../demo/generator';
import { computeDayPlan } from '@/engine/dayPlan';
import { buildSleepDays } from '@/engine/sleepDetection';
import { formatClock, hourOfDay, localTimeToMs } from '@/engine/time';

const TZ = 'Europe/Berlin';
const LAST = '2025-05-14';
const NOW = localTimeToMs(LAST, '12:00', TZ);

describe('demo generator', () => {
  it('is deterministic', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const x = generateDemoSessions({ scenario: 'rested', lastWakeKey: LAST, tz: TZ });
    const y = generateDemoSessions({ scenario: 'rested', lastWakeKey: LAST, tz: TZ });
    expect(x).toEqual(y);
  });

  it.each(DEMO_SCENARIOS.map((s) => s.id))('creates a plausible record for %s', (id) => {
    const sessions = generateDemoSessions({ scenario: id, lastWakeKey: LAST, tz: TZ, nights: 60 });
    expect(sessions.length).toBeGreaterThanOrEqual(55);
    const days = buildSleepDays(sessions, TZ, id === 'shift_worker');
    expect(days.size).toBeGreaterThanOrEqual(55);
    for (const d of days.values()) {
      expect(d.mainMinutes).toBeGreaterThan(180);
      expect(d.mainMinutes).toBeLessThan(11 * 60);
    }
    for (const s of sessions) {
      expect(s.endAt).toBeGreaterThan(s.startAt);
      expect(s.source).toBe('demo');
    }
    const profile = demoProfile(id, TZ, NOW);
    const plan = computeDayPlan({ sessions, profile, now: NOW });
    expect(Number.isFinite(plan.currentEnergy)).toBe(true);
    expect(plan.windows.length).toBeGreaterThan(8);
  });

  it('exam week creates much more debt than the rested scenario', () => {
    const debt = (id: (typeof DEMO_SCENARIOS)[number]['id']) =>
      computeDayPlan({
        sessions: generateDemoSessions({ scenario: id, lastWakeKey: LAST, tz: TZ }),
        profile: demoProfile(id, TZ, NOW),
        now: NOW,
      }).debt.debtMinutes;
    expect(debt('exam_week')).toBeGreaterThan(debt('rested') + 120);
    expect(debt('weekend_catchup')).toBeGreaterThan(debt('rested'));
  });

  it('the late type has a later bedtime and curve than the rested type (not treated as wrong)', () => {
    const run = (id: 'rested' | 'late_early_shift') =>
      computeDayPlan({
        sessions: generateDemoSessions({ scenario: id, lastWakeKey: LAST, tz: TZ }),
        profile: { ...demoProfile(id, TZ, NOW), targetWakeTime: null },
        now: NOW,
      });
    const late = run('late_early_shift');
    const rested = run('rested');
    const h = (ms: number) => ((hourOfDay(ms, TZ) + 12) % 24) - 12; // around midnight
    expect(h(late.bedtime.bedtime)).toBeGreaterThan(h(rested.bedtime.bedtime) + 1);
    expect(late.melatonin.start).toBeGreaterThan(rested.melatonin.start);
    expect(formatClock(late.bedtime.bedtime, TZ)).toMatch(/^\d\d:\d\d$/);
  });
});
