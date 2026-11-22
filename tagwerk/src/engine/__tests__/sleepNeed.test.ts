import { defaultNeedMinutes, estimateSleepNeed } from '../sleepNeed';
import { addDaysToKey, dayOfWeekOfKey, localTimeToMs } from '../time';
import { constantNights, makeProfile, TZ } from './fixtures';
import type { SleepSession } from '../types';

const NOW = localTimeToMs('2025-05-14', '12:00', TZ); // Wednesday
const TODAY = '2025-05-14';

/** 7 h on work days, 8.5 h on free days, for `days` days. */
function weeklyPattern(days: number): SleepSession[] {
  const out: SleepSession[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDaysToKey(TODAY, -i);
    const free = [0, 6].includes(dayOfWeekOfKey(key));
    const minutes = free ? 510 : 420;
    const endAt = localTimeToMs(key, free ? '09:00' : '07:00', TZ);
    out.push({ ...constantNights(key, 1, minutes)[0], endAt, startAt: endAt - minutes * 60_000 });
  }
  return out;
}

describe('defaults', () => {
  it('uses age based defaults', () => {
    expect(defaultNeedMinutes(null, NOW)).toBe(480);
    expect(defaultNeedMinutes(1990, NOW)).toBe(480);
    expect(defaultNeedMinutes(2010, NOW)).toBe(540);
    expect(defaultNeedMinutes(2003, NOW)).toBe(495);
  });

  it('returns the default without data', () => {
    const r = estimateSleepNeed([], makeProfile(), NOW);
    expect(r.minutes).toBe(480);
    expect(r.basis).toBe('default');
    expect(r.nights).toBe(0);
  });

  it('stays at the default with fewer than 14 nights', () => {
    const r = estimateSleepNeed(weeklyPattern(10), makeProfile(), NOW);
    expect(r.basis).toBe('default');
    expect(r.nights).toBe(10);
  });
});

describe('estimation', () => {
  it('7 h on work days and 8.5 h at weekends gives roughly 8:15-8:30', () => {
    const r = estimateSleepNeed(weeklyPattern(30), makeProfile(), NOW);
    expect(r.basis).toBe('estimated');
    expect(r.minutes).toBeGreaterThanOrEqual(495);
    expect(r.minutes).toBeLessThanOrEqual(510);
    expect(r.nights).toBe(30);
  });

  it('uses recovery nights when enough low-debt free days exist', () => {
    // 9 h every night -> no debt, free days qualify
    const r = estimateSleepNeed(constantNights(TODAY, 60, 540), makeProfile(), NOW);
    expect(r.recoveryNights).toBeGreaterThanOrEqual(5);
    expect(r.minutes).toBeCloseTo(540, 0);
  });

  it('ignores free nights that follow a large debt', () => {
    const r = estimateSleepNeed(weeklyPattern(60), makeProfile(), NOW);
    expect(r.recoveryNights).toBeLessThan(5);
  });

  it('smooths against a previous estimate (0.8 old + 0.2 new)', () => {
    const profile = makeProfile({ sleepNeedMinutesEstimated: 480 });
    const r = estimateSleepNeed(constantNights(TODAY, 60, 540), profile, NOW);
    expect(r.measured).toBeCloseTo(540, 0);
    expect(r.minutes).toBeCloseTo(0.8 * 480 + 0.2 * 540, 0);
  });

  it('clamps to 6:00-10:30 h', () => {
    const r = estimateSleepNeed(constantNights(TODAY, 40, 700), makeProfile(), NOW);
    expect(r.minutes).toBeLessThanOrEqual(630);
    const r2 = estimateSleepNeed(constantNights(TODAY, 40, 200), makeProfile(), NOW);
    expect(r2.minutes).toBeGreaterThanOrEqual(360);
  });

  it('manual override always wins', () => {
    const r = estimateSleepNeed(weeklyPattern(60), makeProfile({ sleepNeedMinutesManual: 450 }), NOW);
    expect(r.minutes).toBe(450);
    expect(r.basis).toBe('manual');
    expect(estimateSleepNeed([], makeProfile({ sleepNeedMinutesManual: 900 }), NOW).minutes).toBe(630);
  });

  it('shift workers have no free days, late wake-ups count as recovery', () => {
    const profile = makeProfile({
      workSchedule: { workDays: [1, 2, 3, 4, 5], workStart: '09:00', workEnd: '17:00', shiftMode: true },
    });
    const r = estimateSleepNeed(constantNights(TODAY, 40, 480, '11:00'), profile, NOW);
    expect(r.recoveryNights).toBeGreaterThan(0);
    expect(r.minutes).toBeCloseTo(480, 0);
  });
});
