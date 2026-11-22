import { C_RANGE, PressureModel, circadianPosition, computeCircadianOffset, debtFactor, debtMalus, energyRaw, inertia, processC, semidian } from '../twoProcess';
import { HOUR } from '../constants';
import { addDaysToKey, localTimeToMs, tzOffsetMin } from '../time';
import { constantNights, makeProfile, night, TZ } from './fixtures';

function argExtremes(offsetMin: number) {
  let min = Infinity, max = -Infinity, tMin = 0, tMax = 0;
  for (let h = 0; h < 24; h += 0.01) {
    const c = processC(h, offsetMin);
    if (c < min) { min = c; tMin = h; }
    if (c > max) { max = c; tMax = h; }
  }
  return { tMin, tMax };
}

describe('process C', () => {
  it('has its minimum around 04:00-05:00 and maximum around 18:00-20:00 (reference type)', () => {
    const { tMin, tMax } = argExtremes(0);
    expect(tMin).toBeGreaterThanOrEqual(3.5);
    expect(tMin).toBeLessThanOrEqual(5);
    expect(tMax).toBeGreaterThanOrEqual(18);
    expect(tMax).toBeLessThanOrEqual(20.5);
  });

  it.each([
    ['early', -120],
    ['intermediate', 0],
    ['late', 120],
  ])('shifts with the %s chronotype offset', (_n, offset) => {
    const { tMin, tMax } = argExtremes(offset);
    const ref = argExtremes(0);
    expect(tMin).toBeCloseTo(ref.tMin + offset / 60, 1);
    expect(tMax).toBeCloseTo(ref.tMax + offset / 60, 1);
  });

  it('is periodic over 24 h and stays within its range', () => {
    expect(processC(3, 0)).toBeCloseTo(processC(27, 0), 10);
    for (let h = 0; h < 24; h += 0.5) {
      expect(processC(h)).toBeGreaterThanOrEqual(C_RANGE.min - 1e-9);
      expect(processC(h)).toBeLessThanOrEqual(C_RANGE.max + 1e-9);
    }
    expect(circadianPosition(4.0)).toBeLessThan(0.05);
    expect(circadianPosition(20)).toBeGreaterThan(0.95);
  });

  it('adds a post-lunch dip through the semidian component', () => {
    expect(semidian(14.5, 0)).toBeLessThan(semidian(9, 0));
    expect(semidian(14.5, 0)).toBeLessThan(semidian(20, 0));
  });
});

describe('process S', () => {
  const t0 = Date.UTC(2025, 4, 1, 0, 0);
  it('rises while awake and decays during sleep', () => {
    const m = new PressureModel([{ startAt: t0 + 16 * HOUR, endAt: t0 + 24 * HOUR }], t0, 0.3);
    expect(m.at(t0)).toBeCloseTo(0.3);
    expect(m.at(t0 + 8 * HOUR)).toBeGreaterThan(m.at(t0 + 1 * HOUR));
    expect(m.at(t0 + 16 * HOUR)).toBeCloseTo(1 - 0.7 * Math.exp(-16 / 18.2), 10);
    expect(m.at(t0 + 24 * HOUR)).toBeLessThan(m.at(t0 + 16 * HOUR) * 0.2);
    expect(m.at(t0 + 30 * HOUR)).toBeGreaterThan(m.at(t0 + 24 * HOUR));
  });

  it('is continuous at the boundaries and bounded in 0..1', () => {
    const m = new PressureModel([{ startAt: t0 + 16 * HOUR, endAt: t0 + 24 * HOUR }], t0);
    expect(Math.abs(m.at(t0 + 16 * HOUR - 1) - m.at(t0 + 16 * HOUR + 1))).toBeLessThan(1e-6);
    for (let h = 0; h < 80; h += 0.5) {
      const v = m.at(t0 + h * HOUR);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('works without any sleep and before the first segment', () => {
    const m = new PressureModel([], t0, 0.2);
    expect(m.at(t0)).toBeCloseTo(0.2);
    expect(m.at(t0 + 10 * HOUR)).toBeGreaterThan(0.2);
    const m2 = new PressureModel([{ startAt: t0 + 5 * HOUR, endAt: t0 + 6 * HOUR }], t0, 0.2);
    expect(m2.at(t0 - HOUR)).toBeCloseTo(0.2);
  });

  it('reflects a short night: higher pressure after short sleep', () => {
    const long = new PressureModel([{ startAt: t0 + 16 * HOUR, endAt: t0 + 24 * HOUR }], t0);
    const short = new PressureModel([{ startAt: t0 + 16 * HOUR, endAt: t0 + 20 * HOUR }], t0);
    expect(short.at(t0 + 20 * HOUR)).toBeGreaterThan(long.at(t0 + 24 * HOUR));
  });

  it('merges overlapping sleep intervals gracefully', () => {
    const m = new PressureModel(
      [
        { startAt: t0 + 5 * HOUR, endAt: t0 + 9 * HOUR },
        { startAt: t0 + 8 * HOUR, endAt: t0 + 10 * HOUR },
      ],
      t0,
    );
    expect(m.at(t0 + 9.5 * HOUR)).toBeLessThan(m.at(t0 + 5 * HOUR));
  });
});

describe('inertia, debt malus and energy', () => {
  it('decays with a 0.6 h time constant', () => {
    expect(inertia(0, 0, 0)).toBeCloseTo(0.25);
    expect(inertia(0.6, 0, 0)).toBeCloseTo(0.25 / Math.E, 6);
    expect(inertia(-1, 0, 0)).toBe(0);
  });

  it('is stronger with sleep debt and near the circadian minimum', () => {
    expect(inertia(0, 600, 0)).toBeCloseTo(0.25 * 1.5, 6);
    expect(inertia(0, 0, 1)).toBeGreaterThan(inertia(0, 0, 0));
    expect(debtFactor(1200)).toBe(1);
  });

  it('debt malus scales to 1.5 x 0.08', () => {
    expect(debtMalus(0)).toBe(0);
    expect(debtMalus(600)).toBeCloseTo(0.08);
    expect(debtMalus(6000)).toBeCloseTo(0.12);
  });

  it('more debt means lower raw energy', () => {
    const base = { hour: 12, offsetMin: 0, s: 0.4, hoursSinceWake: 5, circLowAtWake: 0 };
    expect(energyRaw({ ...base, debtMinutes: 600 })).toBeLessThan(energyRaw({ ...base, debtMinutes: 0 }));
  });
});

describe('circadian phase (shift mode and jetlag)', () => {
  const shiftProfile = (over = {}) =>
    makeProfile({
      workSchedule: { workDays: [1, 2, 3, 4, 5], workStart: '09:00', workEnd: '17:00', shiftMode: true },
      ...over,
    });

  it('stays at the stored offset without shift mode', () => {
    const now = localTimeToMs('2025-05-14', '12:00', TZ);
    const r = computeCircadianOffset(constantNights('2025-05-14', 14, 480), makeProfile({ circadianPhaseOffsetMin: 90 }), now);
    expect(r.offsetMin).toBe(90);
    expect(r.adapting).toBe(false);
    expect(r.adaptDaysLeft).toBe(0);
  });

  it('moves at most one hour per day when the sleep phase flips', () => {
    // 8 days of night sleep 23:00-07:00, then day sleep 09:00-17:00
    const profile = shiftProfile();
    const sessions = [];
    for (let i = 0; i < 8; i++) sessions.push(night(addDaysToKey('2025-05-01', i), '23:00', '07:00'));
    for (let i = 8; i < 14; i++) sessions.push(night(addDaysToKey('2025-05-01', i), '09:00', '17:00'));
    let prev = computeCircadianOffset(sessions, profile, localTimeToMs('2025-05-08', '18:00', TZ));
    expect(prev.adapting).toBe(false);
    let moved = false;
    for (let d = 9; d <= 14; d++) {
      const key = addDaysToKey('2025-05-01', d - 1);
      const cur = computeCircadianOffset(sessions, profile, localTimeToMs(key, '18:00', TZ));
      expect(Math.abs(cur.offsetMin - prev.offsetMin)).toBeLessThanOrEqual(60.0001);
      if (cur.offsetMin !== prev.offsetMin) moved = true;
      prev = cur;
    }
    expect(moved).toBe(true);
    expect(prev.adapting).toBe(true);
    expect(prev.adaptDaysLeft).toBeGreaterThan(0);
  });

  it('shift mode adopts a stable late sleep phase', () => {
    const sessions = constantNights('2025-05-14', 14, 480, '11:00');
    const r = computeCircadianOffset(sessions, shiftProfile(), localTimeToMs('2025-05-14', '12:00', TZ));
    // mid-sleep at 07:00 -> +180 min over the 04:00 reference
    expect(r.offsetMin).toBeCloseTo(180, 0);
    expect(r.adapting).toBe(false);
  });

  it('adapts gradually after a time zone change (jetlag)', () => {
    const NY = 'America/New_York';
    const sessions = [
      ...constantNights('2025-05-10', 11, 480),
      night('2025-05-11', '23:00', '07:00', {}, NY),
      night('2025-05-12', '23:00', '07:00', {}, NY),
    ];
    // fix the first of the new-zone nights to be on NY dates
    const profile = makeProfile({ timezone: NY });
    const now = localTimeToMs('2025-05-12', '12:00', NY);
    const r = computeCircadianOffset(sessions.filter((s) => s.timezone === TZ || s.endAt < now), profile, now);
    const delta = tzOffsetMin(localTimeToMs('2025-05-11', '12:00', NY), NY) - tzOffsetMin(localTimeToMs('2025-05-11', '12:00', NY), TZ);
    expect(delta).toBe(-360);
    expect(r.adapting).toBe(true);
    expect(r.offsetMin).toBeLessThan(0);
    expect(r.offsetMin).toBeGreaterThanOrEqual(-360);
    // 6 h shift, moved 60 min per elapsed day
    expect(r.adaptDaysLeft).toBeGreaterThanOrEqual(3);
  });

  it('uses the device zone for days after the last recorded night', () => {
    const NY = 'America/New_York';
    const sessions = constantNights('2025-05-10', 14, 480);
    const profile = makeProfile({ timezone: NY });
    const r = computeCircadianOffset(sessions, profile, localTimeToMs('2025-05-14', '12:00', NY));
    expect(r.adapting).toBe(true);
  });

  it('copes with no data at all', () => {
    const r = computeCircadianOffset([], shiftProfile({ circadianPhaseOffsetMin: 30 }), localTimeToMs('2025-05-14', '12:00', TZ));
    expect(r.offsetMin).toBe(30);
    expect(r.adapting).toBe(false);
  });
});
