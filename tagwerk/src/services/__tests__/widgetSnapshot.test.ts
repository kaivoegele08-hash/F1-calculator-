import { computeDayPlan } from '@/engine/dayPlan';
import { constantNights, makeProfile, TZ } from '@/engine/__tests__/fixtures';
import { localTimeToMs } from '@/engine/time';
import { buildWidgetSnapshot } from '../widgetSnapshot';

describe('widget snapshot', () => {
  it('summarises the day for a widget', () => {
    const now = localTimeToMs('2025-05-14', '10:00', TZ);
    const plan = computeDayPlan({ sessions: constantNights('2025-05-14', 20, 450), profile: makeProfile(), now });
    const snap = buildWidgetSnapshot(plan, now);
    expect(snap.version).toBe(1);
    expect(snap.curve.length).toBeGreaterThanOrEqual(20);
    expect(snap.curve.length).toBeLessThanOrEqual(30);
    expect(snap.debtMinutes).toBe(Math.round(plan.debt.debtMinutes));
    expect(snap.next?.at).toBeGreaterThan(now);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
  });
});
