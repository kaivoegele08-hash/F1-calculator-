import { defaultHabits } from '@/content/habits';
import { constantNights, makeProfile, TZ } from '@/engine/__tests__/fixtures';
import { localTimeToMs, formatClock } from '@/engine/time';
import { MAX_SCHEDULED, planReminders } from '../notificationPlan';
import { computeDayPlan } from '@/engine/dayPlan';

const TODAY = '2025-05-14';
const profile = makeProfile();
const sessions = constantNights(TODAY, 20, 480);
const now = localTimeToMs(TODAY, '08:00', TZ);

describe('planReminders', () => {
  it('plans today and the following days within the iOS limit', () => {
    const r = planReminders({ profile, sessions, habits: defaultHabits(), now });
    expect(r.length).toBeGreaterThan(10);
    expect(r.length).toBeLessThanOrEqual(MAX_SCHEDULED);
    const sorted = [...r].sort((a, b) => a.at - b.at);
    expect(r).toEqual(sorted);
    for (const x of r) expect(x.at).toBeGreaterThan(now);
    const dates = new Set(r.map((x) => x.date));
    expect(dates.size).toBeGreaterThanOrEqual(6);
  });

  it('only includes habits that are enabled with reminders and anchors them to the windows', () => {
    const habits = defaultHabits().map((h) => ({ ...h, enabled: h.key === 'caffeine_cutoff', reminderEnabled: true }));
    const r = planReminders({ profile, sessions, habits, now, days: 1 });
    expect(r.every((x) => x.kind === 'caffeine_cutoff')).toBe(true);
    const plan = computeDayPlan({ sessions, profile, now });
    const stop = plan.windows.find((w) => w.kind === 'caffeine_stop')!;
    expect(r[0].at).toBe(stop.start - 30 * 60_000);
    expect(formatClock(r[0].at, TZ)).toMatch(/^\d\d:\d\d$/);
  });

  it('plans nothing after bedtime (quiet hours) on the same day', () => {
    const late = localTimeToMs(TODAY, '23:30', TZ);
    const habits = defaultHabits().map((h) => ({ ...h, enabled: true, reminderEnabled: true }));
    const r = planReminders({ profile, sessions, habits, now: late, days: 1 });
    expect(r.filter((x) => x.date === TODAY)).toEqual([]);
  });

  it('adds a morning quick check when enabled', () => {
    const habits = defaultHabits().map((h) => ({ ...h, reminderEnabled: false }));
    const r = planReminders({ profile, sessions, habits, now, days: 3, morningCheck: true });
    expect(r.filter((x) => x.kind === 'sleep_check').length).toBeGreaterThanOrEqual(2);
  });

  it('caps the plan at seven days and 60 notifications', () => {
    const habits = defaultHabits().map((h) => ({ ...h, enabled: true, reminderEnabled: true }));
    const r = planReminders({ profile, sessions, habits, now, days: 30, morningCheck: true });
    expect(r.length).toBeLessThanOrEqual(MAX_SCHEDULED);
    expect(new Set(r.map((x) => x.date)).size).toBeLessThanOrEqual(8);
  });

  it('skips reminders whose window is missing and ignores disabled habits', () => {
    const habits = defaultHabits().map((h) => ({ ...h, enabled: false }));
    expect(planReminders({ profile, sessions, habits, now, days: 2 })).toEqual([]);
  });
});
