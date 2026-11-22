import { computeDayPlan } from '../dayPlan';
import { ALL_TIP_IDS, selectTips } from '../recommendations';
import { addDaysToKey, localTimeToMs } from '../time';
import { constantNights, makeProfile, night, TZ } from './fixtures';

const TODAY = '2025-05-14';
const now = localTimeToMs(TODAY, '10:00', TZ);
const profile = makeProfile();

function ctx(sessions = constantNights(TODAY, 20, 480), extra = {}, history: Record<string, string[]> = {}, prof = profile) {
  const plan = computeDayPlan({ sessions, profile: prof, now });
  return { plan, sessions, profile: prof, today: TODAY, history, ...extra };
}

describe('recommendations', () => {
  it('returns between 1 and 3 tips', () => {
    const tips = selectTips(ctx());
    expect(tips.length).toBeGreaterThanOrEqual(1);
    expect(tips.length).toBeLessThanOrEqual(3);
    for (const t of tips) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.body).toBeTruthy();
    }
    expect(ALL_TIP_IDS.length).toBeGreaterThan(5);
  });

  it('recommends going to bed earlier with high sleep debt', () => {
    const tips = selectTips(ctx(constantNights(TODAY, 20, 300)));
    expect(tips[0].id).toBe('debt_high');
    expect(tips[0].ctaHabitKey).toBe('bedtime');
  });

  it('recommends catching up with medium debt', () => {
    const tips = selectTips(ctx(constantNights(TODAY, 20, 420)));
    expect(tips.map((t) => t.id)).toContain('debt_mid');
  });

  it('flags irregular bedtimes', () => {
    const s = Array.from({ length: 20 }, (_, i) =>
      night(addDaysToKey(TODAY, -i), i % 2 ? '21:30' : '01:30', '07:30'),
    );
    expect(selectTips(ctx(s)).map((t) => t.id)).toContain('regularity');
  });

  it('suggests the caffeine tip after repeated late coffee and the social jetlag tip', () => {
    const c = ctx(undefined, { caffeineLateDays: 4, socialJetlagHours: 2.5 });
    const ids = selectTips(c).map((t) => t.id);
    expect(ids).toContain('caffeine_halflife');
    expect(ids).toContain('social_jetlag');
  });

  it('mentions the adapting clock when the phase is shifting', () => {
    const shift = makeProfile({ workSchedule: { workDays: [1], workStart: '', workEnd: '', shiftMode: true } });
    const s = [
      ...constantNights(addDaysToKey(TODAY, -4), 10, 480),
      ...constantNights(TODAY, 4, 480, '16:00'),
    ];
    const plan = computeDayPlan({ sessions: s, profile: shift, now });
    expect(plan.phase.adapting).toBe(true);
    const tips = selectTips({ plan, sessions: s, profile: shift, today: TODAY, history: {} });
    expect(tips.map((t) => t.id)).toContain('clock_adapting');
  });

  it('flags long grogginess', () => {
    const c = ctx(constantNights(TODAY, 20, 480));
    c.plan = { ...c.plan, features: { ...c.plan.features, grogginessEnd: c.plan.wakeAt + 100 * 60_000 } };
    expect(selectTips(c).map((t) => t.id)).toContain('groggy_long');
  });

  it('does not repeat a tip on more than two consecutive days', () => {
    const base = ctx(constantNights(TODAY, 20, 300));
    const first = selectTips(base)[0].id;
    expect(first).toBe('debt_high');
    const history = {
      [addDaysToKey(TODAY, -1)]: ['debt_high'],
      [addDaysToKey(TODAY, -2)]: ['debt_high'],
    };
    const again = selectTips({ ...base, history });
    expect(again.map((t) => t.id)).not.toContain('debt_high');
    const onlyOne = selectTips({ ...base, history: { [addDaysToKey(TODAY, -1)]: ['debt_high'] } });
    expect(onlyOne.map((t) => t.id)).toContain('debt_high');
  });

  it('always falls back to at least one tip', () => {
    const everything = Object.fromEntries(
      [1, 2].map((n) => [addDaysToKey(TODAY, -n), ALL_TIP_IDS]),
    );
    const tips = selectTips({ ...ctx(), history: everything });
    expect(tips.length).toBe(1);
    expect(tips[0].id).toBe('morning_light');
  });
});
