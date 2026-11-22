import { computeDebt, debtLevel, forecastDebt, weightFor } from '../sleepDebt';
import { addDaysToKey, localTimeToMs } from '../time';
import { constantNights, makeProfile, nap, night, TZ } from './fixtures';

const TODAY = '2025-05-14';
const NOW = localTimeToMs(TODAY, '12:00', TZ);
const NEED = 480;

describe('sleep debt', () => {
  it('weights sum to about 8.05', () => {
    let sum = 0;
    for (let i = 0; i < 14; i++) sum += weightFor(i);
    expect(sum).toBeCloseTo(8.05, 2);
    expect(weightFor(0)).toBe(1);
    expect(weightFor(13)).toBeCloseTo(0.15);
  });

  it('is zero when sleeping exactly the need every night', () => {
    const d = computeDebt(constantNights(TODAY, 14, NEED), NEED, TZ, NOW);
    expect(d.debtMinutes).toBeCloseTo(0, 6);
    expect(d.level).toBe('low');
    expect(d.missingCount).toBe(0);
    expect(d.nights).toHaveLength(14);
  });

  it('is about 8 h 03 min with one hour too little every night', () => {
    const d = computeDebt(constantNights(TODAY, 14, NEED - 60), NEED, TZ, NOW);
    expect(d.debtMinutes).toBeCloseTo(8.05 * 60, 0);
    expect(Math.round(d.debtMinutes)).toBe(483);
    expect(d.level).toBe('medium');
  });

  it('matches a manual hand calculation of the formula', () => {
    const slept = [400, 480, 300, 540, 450, 480, 420, 480, 480, 360, 480, 480, 500, 480];
    const sessions = slept.flatMap((m, i) => constantNights(addDaysToKey(TODAY, -i), 1, m));
    let expected = 0;
    slept.forEach((m, i) => {
      const w = 1 - i * (0.85 / 13);
      const delta = NEED - m;
      expected += delta > 0 ? w * delta : w * delta * 0.5;
    });
    expect(computeDebt(sessions, NEED, TZ, NOW).debtMinutes).toBeCloseTo(expected, 6);
  });

  it('a single long night after a deficit week reduces debt by at most half the surplus x weight', () => {
    const deficit = constantNights(addDaysToKey(TODAY, -1), 13, NEED - 60);
    const before = computeDebt(
      [...deficit, ...constantNights(TODAY, 1, NEED - 60)],
      NEED,
      TZ,
      NOW,
    ).debtMinutes;
    const after = computeDebt([...deficit, ...constantNights(TODAY, 1, NEED + 120)], NEED, TZ, NOW).debtMinutes;
    expect(after).toBeLessThan(before);
    // night 0: contribution changes from +60*1 to -120*0.5 = -60 -> reduction 120
    expect(before - after).toBeCloseTo(120, 6);
    expect(before - after).toBeLessThanOrEqual(120 * 1.0001);
  });

  it('never goes negative', () => {
    const d = computeDebt(constantNights(TODAY, 14, NEED + 180), NEED, TZ, NOW);
    expect(d.debtMinutes).toBe(0);
  });

  it('counts naps with weight 0.75', () => {
    const sessions = [
      ...constantNights(addDaysToKey(TODAY, -1), 13, NEED),
      night(TODAY, '23:00', '06:00'),
      nap(TODAY, '14:00', '14:40'),
    ];
    const d = computeDebt(sessions, NEED, TZ, NOW);
    expect(d.nights[0].sleptMinutes).toBeCloseTo(420 + 0.75 * 40, 6);
  });

  it('fills missing nights with the median instead of zero', () => {
    const sessions = constantNights(TODAY, 10, NEED - 60);
    const d = computeDebt(sessions, NEED, TZ, NOW);
    expect(d.missingCount).toBe(4);
    expect(d.insufficientData).toBe(false);
    expect(d.nights.filter((n) => n.estimated)).toHaveLength(4);
    expect(d.nights[13].sleptMinutes).toBe(NEED - 60);
    // the same as a complete record: no artificial debt
    const full = computeDebt(constantNights(TODAY, 14, NEED - 60), NEED, TZ, NOW);
    expect(d.debtMinutes).toBeCloseTo(full.debtMinutes, 6);
  });

  it('reports insufficient data with a range when more than 5 nights are missing', () => {
    const sessions = [...constantNights(TODAY, 3, NEED - 60), ...constantNights(addDaysToKey(TODAY, -3), 3, NEED - 120)];
    const d = computeDebt(sessions, NEED, TZ, NOW);
    expect(d.insufficientData).toBe(true);
    expect(d.range).not.toBeNull();
    const [lo, hi] = d.range as [number, number];
    expect(lo).toBeLessThanOrEqual(hi);
    expect(d.debtMinutes).toBeGreaterThanOrEqual(lo - 1e-6);
    expect(d.debtMinutes).toBeLessThanOrEqual(hi + 1e-6);
  });

  it('has no range without any data', () => {
    const d = computeDebt([], NEED, TZ, NOW);
    expect(d.insufficientData).toBe(true);
    expect(d.range).toBeNull();
    expect(d.debtMinutes).toBe(0);
  });

  it('classifies levels at 5 h and 10 h', () => {
    expect(debtLevel(0)).toBe('low');
    expect(debtLevel(299)).toBe('low');
    expect(debtLevel(300)).toBe('medium');
    expect(debtLevel(599)).toBe('medium');
    expect(debtLevel(600)).toBe('high');
  });

  it('respects an explicit reference date', () => {
    const sessions = constantNights('2025-05-10', 14, NEED - 30);
    const d = computeDebt(sessions, NEED, TZ, NOW, { refDate: '2025-05-10' });
    expect(d.missingCount).toBe(0);
  });
});

describe('forecast', () => {
  it('predicts lower debt after a long night', () => {
    const profile = makeProfile();
    const sessions = constantNights(TODAY, 14, NEED - 60);
    const bed = localTimeToMs(TODAY, '22:30', profile.timezone);
    const wake = localTimeToMs(addDaysToKey(TODAY, 1), '07:00', profile.timezone);
    const f = forecastDebt(sessions, NEED, TZ, NOW, bed, wake);
    const now = computeDebt(sessions, NEED, TZ, NOW).debtMinutes;
    expect(f.debtMinutes).toBeLessThan(now);
    expect(f.reductionMinutes).toBeGreaterThan(0);
  });

  it('a short night raises the forecast', () => {
    const sessions = constantNights(TODAY, 14, NEED);
    const bed = localTimeToMs(TODAY, '02:30', TZ);
    const wake = localTimeToMs(addDaysToKey(TODAY, 1), '07:00', TZ);
    const f = forecastDebt(sessions, NEED, TZ, NOW, bed + 24 * 3600_000, wake);
    expect(f.reductionMinutes).toBeLessThan(0);
  });
});
