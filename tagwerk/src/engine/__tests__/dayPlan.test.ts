import { computeDayPlan, computeTomorrowPlan, resolveNeed } from '../dayPlan';
import { buildWindows, melatoninWindow, napLengthMinutes, nextClockTime, recommendBedtime } from '../windows';
import { DAY, HOUR, MIN } from '../constants';
import { addDaysToKey, formatClock, localTimeToMs } from '../time';
import { constantNights, makeProfile, night, nap, TZ } from './fixtures';
import type { SleepSession } from '../types';

const TODAY = '2025-05-14';
const at = (h: string, key = TODAY) => localTimeToMs(key, h, TZ);
const clock = (ms: number) => formatClock(ms, TZ);

describe('windows', () => {
  it('finds the next clock time strictly after an instant, also over midnight', () => {
    expect(clock(nextClockTime(at('10:00'), 22.5, TZ))).toBe('22:30');
    const n = nextClockTime(at('23:00'), 6.5, TZ);
    expect(clock(n)).toBe('06:30');
    expect(n).toBeGreaterThan(at('23:00'));
  });

  it('places the melatonin window around the habitual onset, shifted by the chronotype', () => {
    const m = melatoninWindow(at('07:00'), 0, TZ);
    expect(clock(m.start)).toBe('22:30');
    expect(clock(m.end)).toBe('23:30');
    expect(m.start - m.dlmo).toBe(2 * HOUR);
    const late = melatoninWindow(at('09:00'), 120, TZ);
    expect(clock(late.start)).toBe('00:30');
    const early = melatoninWindow(at('05:00'), -120, TZ);
    expect(clock(early.start)).toBe('20:30');
  });

  it('recommends the middle of the melatonin window without a target wake time', () => {
    const profile = makeProfile();
    const mel = melatoninWindow(at('07:00'), 0, TZ);
    const b = recommendBedtime({ wakeAt: at('07:00'), profile, needMinutes: 480, debtMinutes: 0, melatonin: mel });
    expect(clock(b.bedtime)).toBe('23:00');
    expect(b.hint).toBeNull();
    expect(b.wakeAt - b.bedtime).toBe((480 + 15) * MIN);
  });

  it('computes bedtime from the target wake time, need, debt payback and onset', () => {
    const profile = makeProfile({ targetWakeTime: '07:00' });
    const mel = melatoninWindow(at('07:00'), 0, TZ);
    const noDebt = recommendBedtime({ wakeAt: at('07:00'), profile, needMinutes: 480, debtMinutes: 0, melatonin: mel });
    expect(clock(noDebt.bedtime)).toBe('22:45');
    const debt = recommendBedtime({ wakeAt: at('07:00'), profile, needMinutes: 480, debtMinutes: 240, melatonin: mel });
    expect(debt.debtPaybackMinutes).toBe(36);
    expect(clock(debt.bedtime)).toBe('22:09');
    const huge = recommendBedtime({ wakeAt: at('07:00'), profile, needMinutes: 480, debtMinutes: 2000, melatonin: mel });
    expect(huge.debtPaybackMinutes).toBe(60);
  });

  it('warns and clamps when the bedtime would be too early', () => {
    const profile = makeProfile({ targetWakeTime: '05:00' });
    const mel = melatoninWindow(at('05:00'), 0, TZ);
    const b = recommendBedtime({ wakeAt: at('05:00'), profile, needMinutes: 480, debtMinutes: 0, melatonin: mel });
    expect(b.hint).toBe('too_early');
    expect(clock(b.bedtime)).toBe('21:30');
    expect(b.wakeAt).toBeGreaterThan(at('05:00', addDaysToKey(TODAY, 1)));
  });

  it('suggests a long nap only with a lot of debt', () => {
    expect(napLengthMinutes(0)).toBe(20);
    expect(napLengthMinutes(700)).toBe(90);
  });

  it('keeps nap late enough before bed and drops it when it would not fit', () => {
    const features = {
      grogginessEnd: at('08:15'),
      morningPeak: { start: at('09:30'), end: at('11:00') },
      afternoonDip: { start: at('17:00'), end: at('18:00') },
      eveningPeak: { start: at('20:00'), end: at('21:00') },
      heuristic: false,
    };
    const mel = melatoninWindow(at('07:00'), 0, TZ);
    const bedtime = at('23:00');
    const w = buildWindows({ wakeAt: at('07:00'), features, bedtime, melatonin: mel, caffeineCutoffHours: 8, debtMinutes: 0 });
    const napW = w.find((x) => x.kind === 'nap');
    expect(napW).toBeDefined();
    expect(napW!.start).toBeLessThanOrEqual(bedtime - 7 * HOUR);
    const early = buildWindows({
      wakeAt: at('07:00'),
      features: { ...features, afternoonDip: { start: at('07:30'), end: at('08:00') } },
      bedtime,
      melatonin: mel,
      caffeineCutoffHours: 8,
      debtMinutes: 0,
    });
    expect(early.find((x) => x.kind === 'nap')).toBeUndefined();
  });
});

describe('day plan', () => {
  const profile = makeProfile();
  const sessions = constantNights(TODAY, 20, 480, '07:00');
  const now = at('10:00');

  it('builds a sensible plan for a rested day', () => {
    const p = computeDayPlan({ sessions, profile, now });
    expect(clock(p.wakeAt)).toBe('07:00');
    expect(p.hasWakeData).toBe(true);
    expect(p.date).toBe(TODAY);
    expect(p.debt.debtMinutes).toBeCloseTo(0, 3);
    expect(p.needMinutes).toBe(480);
    expect(clock(p.bedtime.bedtime)).toBe('23:00');
    expect(p.currentEnergy).toBeGreaterThan(40);
    expect(p.curve.points.length).toBe(289);
  });

  it('lists all 5.8 windows in a sensible order', () => {
    const p = computeDayPlan({ sessions, profile, now });
    const kinds = p.windows.map((w) => w.kind);
    for (const k of ['grogginess', 'morning_light', 'morning_peak', 'caffeine_stop', 'afternoon_dip', 'nap', 'evening_peak', 'sport', 'last_meal', 'dim_light', 'wind_down', 'melatonin', 'bedtime'])
      expect(kinds).toContain(k);
    const starts = p.windows.map((w) => w.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    const get = (k: string) => p.windows.find((w) => w.kind === k)!;
    expect(get('caffeine_stop').start).toBe(p.bedtime.bedtime - 8 * HOUR);
    expect(get('last_meal').start).toBe(p.bedtime.bedtime - 3 * HOUR);
    expect(get('dim_light').start).toBe(p.melatonin.start - 90 * MIN);
    expect(get('wind_down').start).toBe(p.melatonin.start - 60 * MIN);
    expect(get('morning_light').end - get('morning_light').start).toBe(60 * MIN);
    expect(get('morning_peak').start).toBeLessThan(get('afternoon_dip').start);
    expect(get('sport').end).toBeLessThanOrEqual(get('wind_down').start - 2 * HOUR);
    expect(get('caffeine_stop').point).toBe(true);
  });

  it('honours the caffeine cut-off setting', () => {
    const p = computeDayPlan({ sessions, profile: makeProfile({ caffeineCutoffHours: 10 }), now });
    const c = p.windows.find((w) => w.kind === 'caffeine_stop')!;
    expect(c.start).toBe(p.bedtime.bedtime - 10 * HOUR);
  });

  it('reports the current phase and the next event', () => {
    const groggy = computeDayPlan({ sessions, profile, now: at('07:30') });
    expect(groggy.currentPhase).toBe('grogginess');
    expect(groggy.nextEvent).not.toBeNull();
    expect(groggy.nextEvent!.at).toBeGreaterThan(at('07:30'));
    const late = computeDayPlan({ sessions, profile, now: at('22:45') });
    expect(['wind_down', 'melatonin']).toContain(late.currentPhase);
    const very = computeDayPlan({ sessions, profile, now: at('23:30') });
    expect(very.nextEvent).toBeNull();
  });

  it('uses the target wake time and estimates the wake-up when no data exists', () => {
    const p = computeDayPlan({ sessions: [], profile: makeProfile({ targetWakeTime: '06:30' }), now: at('12:00') });
    expect(p.hasWakeData).toBe(false);
    expect(clock(p.wakeAt)).toBe('06:30');
    expect(p.debt.insufficientData).toBe(true);
    const q = computeDayPlan({ sessions: [], profile, now: at('12:00') });
    expect(clock(q.wakeAt)).toBe('06:30');
    const early = computeDayPlan({ sessions: [], profile, now: at('03:00') });
    expect(early.wakeAt).toBeLessThan(at('03:00'));
  });

  it('a late chronotype has a visibly later curve and bedtime', () => {
    const lateSessions = constantNights(TODAY, 20, 480, '09:00');
    const late = computeDayPlan({ sessions: lateSessions, profile: makeProfile({ chronotype: 'late', circadianPhaseOffsetMin: 120 }), now: at('12:00') });
    const norm = computeDayPlan({ sessions, profile, now: at('12:00') });
    const hourOf = (ms: number) => (ms - localTimeToMs(TODAY, '00:00', TZ)) / HOUR;
    expect(hourOf(late.bedtime.bedtime)).toBeGreaterThan(hourOf(norm.bedtime.bedtime) + 1.5);
    expect(late.features.eveningPeak.start - late.wakeAt).toBeGreaterThan(norm.features.eveningPeak.start - norm.wakeAt - 1 * HOUR);
    expect(clock(late.melatonin.start)).toBe('00:30');
    const lateEveningHour = hourOf(late.features.eveningPeak.start);
    expect(lateEveningHour).toBeGreaterThan(hourOf(norm.features.eveningPeak.start));
    expect(late.phase.adapting).toBe(false);
  });

  it('works across the spring DST night in Europe/Berlin', () => {
    const dst: SleepSession[] = [
      ...constantNights('2025-03-29', 19, 480),
      { ...night('2025-03-30', '23:00', '07:00'), startAt: at('23:00', '2025-03-29'), endAt: at('07:00', '2025-03-30') },
    ];
    const p = computeDayPlan({ sessions: dst, profile, now: at('12:00', '2025-03-30') });
    expect(clock(p.wakeAt)).toBe('07:00');
    expect(p.debt.nights[0].sleptMinutes).toBe(420);
    expect(clock(p.bedtime.bedtime)).toBe('23:00');
    const starts = p.windows.map((w) => w.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('works across the autumn DST night in Europe/Berlin', () => {
    const dst: SleepSession[] = [
      ...constantNights('2025-10-25', 19, 480),
      { ...night('2025-10-26', '23:00', '07:00'), startAt: at('23:00', '2025-10-25'), endAt: at('07:00', '2025-10-26') },
    ];
    const p = computeDayPlan({ sessions: dst, profile, now: at('12:00', '2025-10-26') });
    expect(p.debt.nights[0].sleptMinutes).toBe(540);
    expect(clock(p.bedtime.bedtime)).toBe('23:00');
  });

  it('handles nights across midnight and naps', () => {
    const s = [...constantNights(TODAY, 20, 480, '07:30').slice(1), night(TODAY, '00:15', '07:45'), nap(TODAY, '14:00', '14:25')];
    const p = computeDayPlan({ sessions: s, profile, now: at('15:00') });
    expect(clock(p.wakeAt)).toBe('07:45');
    expect(p.debt.nights[0].sleptMinutes).toBeCloseTo(450 + 0.75 * 25, 3);
  });

  it('resolves need: manual > stored estimate > default', () => {
    expect(resolveNeed(makeProfile({ sleepNeedMinutesManual: 450, sleepNeedMinutesEstimated: 500 }), now)).toBe(450);
    expect(resolveNeed(makeProfile({ sleepNeedMinutesEstimated: 500 }), now)).toBe(500);
    expect(resolveNeed(makeProfile(), now)).toBe(480);
    const p = computeDayPlan({ sessions, profile, now, needMinutes: 510 });
    expect(p.needMinutes).toBe(510);
  });

  it('preview for tomorrow assumes a full night at the recommended bedtime', () => {
    const today = computeDayPlan({ sessions, profile: makeProfile({ targetWakeTime: '07:00' }), now });
    const tomorrow = computeTomorrowPlan({ sessions, profile: makeProfile({ targetWakeTime: '07:00' }), now }, today);
    expect(tomorrow.date).toBe(addDaysToKey(TODAY, 1));
    expect(clock(tomorrow.wakeAt)).toBe('07:00');
    expect(tomorrow.wakeAt).toBeGreaterThan(today.wakeAt + 20 * HOUR);
    const direct = computeTomorrowPlan({ sessions, profile, now });
    expect(direct.date).toBe(addDaysToKey(TODAY, 1));
  });

  it('computes in well under 50 ms for 90 days of data (benchmark)', () => {
    const many = constantNights(TODAY, 90, 470);
    computeDayPlan({ sessions: many, profile, now }); // warm up
    const runs = 10;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) computeDayPlan({ sessions: many, profile, now });
    const avg = (performance.now() - t0) / runs;
    expect(avg).toBeLessThan(50);
  });

  it('never produces NaN values', () => {
    const p = computeDayPlan({ sessions, profile, now });
    expect(Number.isNaN(p.currentEnergy)).toBe(false);
    for (const pt of p.curve.points) expect(Number.isFinite(pt.energy)).toBe(true);
    expect(DAY).toBeGreaterThan(0);
  });
});
