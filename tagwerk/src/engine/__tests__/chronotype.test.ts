import { chronotypeFromAnswers, classify, learnChronotype, midSleepHours, sleepDurationH } from '../chronotype';
import { DAY } from '../constants';
import { addDaysToKey, dayOfWeekOfKey, localTimeToMs } from '../time';
import { makeProfile, night, TZ } from './fixtures';
import type { SleepSession } from '../types';

describe('questionnaire', () => {
  it('computes durations and mid-sleep across midnight', () => {
    expect(sleepDurationH('23:00', '07:00')).toBe(8);
    expect(sleepDurationH('07:00', '07:00')).toBe(24);
    expect(midSleepHours('23:00', '07:00')).toBeCloseTo(3);
    expect(midSleepHours('01:00', '09:00')).toBeCloseTo(5);
    expect(midSleepHours('21:00', '05:00')).toBeCloseTo(1);
    expect(midSleepHours('20:00', '04:00')).toBeCloseTo(0);
    expect(midSleepHours('18:00', '02:00')).toBeCloseTo(-2);
  });

  it('classifies early, intermediate and late', () => {
    expect(classify(2.5)).toBe('early');
    expect(classify(4)).toBe('intermediate');
    expect(classify(5.5)).toBe('late');
  });

  it('corrects MSF for oversleeping on free days (MSFsc)', () => {
    const r = chronotypeFromAnswers({ freeSleepStart: '00:30', freeWake: '09:00', workBed: '23:30', workWake: '06:30' });
    // free 8.5 h, work 7 h -> week avg (5*7+2*8.5)/7 = 7.43; correction (8.5-7.43)/2
    expect(r.msf).toBeCloseTo(4.75);
    expect(r.msfsc).toBeCloseTo(4.75 - (8.5 - (5 * 7 + 2 * 8.5) / 7) / 2, 6);
    expect(r.msfsc).toBeLessThan(r.msf);
    expect(r.chronotype).toBe('intermediate');
    expect(r.socialJetlagHours).toBeCloseTo(4.75 - midSleepHours('23:30', '06:30'), 6);
  });

  it('detects an early bird and a night owl', () => {
    const early = chronotypeFromAnswers({ freeSleepStart: '21:30', freeWake: '05:30', workBed: '21:30', workWake: '05:30' });
    expect(early.chronotype).toBe('early');
    expect(early.score).toBeLessThan(0);
    expect(early.offsetMin).toBeLessThan(0);
    const late = chronotypeFromAnswers({ freeSleepStart: '03:00', freeWake: '11:30', workBed: '01:00', workWake: '07:00' });
    expect(late.chronotype).toBe('late');
    expect(late.score).toBeGreaterThan(0);
    expect(late.offsetMin).toBeGreaterThan(0);
  });

  it('limits the offset to +-240 min and the score to +-1', () => {
    const r = chronotypeFromAnswers({ freeSleepStart: '08:00', freeWake: '16:00', workBed: '08:00', workWake: '16:00' });
    expect(r.offsetMin).toBe(240);
    expect(r.score).toBe(1);
    const e = chronotypeFromAnswers({ freeSleepStart: '18:00', freeWake: '02:00', workBed: '18:00', workWake: '02:00' });
    expect(e.offsetMin).toBe(-240);
    expect(e.score).toBe(-1);
  });

  it('nudges slightly by the self-reported peak time', () => {
    const base = { freeSleepStart: '00:00', freeWake: '08:00', workBed: '00:00', workWake: '08:00' };
    const a = chronotypeFromAnswers({ ...base, peak: 'morning' }).msfsc;
    const b = chronotypeFromAnswers({ ...base, peak: 'midday' }).msfsc;
    const c = chronotypeFromAnswers({ ...base, peak: 'evening' }).msfsc;
    const d = chronotypeFromAnswers({ ...base, peak: 'night' }).msfsc;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(c).toBeLessThan(d);
  });
});

function twentyFiveNights(): SleepSession[] {
  const out: SleepSession[] = [];
  const last = '2025-05-14';
  for (let i = 0; i < 28; i++) {
    const key = addDaysToKey(last, -i);
    const free = [0, 6].includes(dayOfWeekOfKey(key));
    out.push(free ? night(key, '01:30', '09:30') : night(key, '23:30', '06:30'));
  }
  return out;
}

describe('learning from data', () => {
  const now = localTimeToMs('2025-05-14', '12:00', TZ);

  it('returns null with too little data or in shift mode', () => {
    expect(learnChronotype(twentyFiveNights().slice(0, 10), makeProfile(), now)).toBeNull();
    const shift = makeProfile({ workSchedule: { workDays: [1], workStart: '', workEnd: '', shiftMode: true } });
    expect(learnChronotype(twentyFiveNights(), shift, now)).toBeNull();
    expect(learnChronotype([], makeProfile(), now)).toBeNull();
  });

  it('returns null without enough free days', () => {
    const work = Array.from({ length: 25 }, (_, i) => night(addDaysToKey('2025-05-14', -i), '23:30', '06:30')).filter(
      (s) => ![0, 6].includes(dayOfWeekOfKey(new Date(s.endAt).toISOString().slice(0, 10))),
    );
    const p = makeProfile({ workSchedule: { workDays: [0, 1, 2, 3, 4, 5, 6], workStart: '', workEnd: '', shiftMode: false } });
    expect(learnChronotype(work, p, now)).toBeNull();
  });

  it('re-estimates MSFsc and moves the offset by at most 15 min per week', () => {
    const r = learnChronotype(twentyFiveNights(), makeProfile({ circadianPhaseOffsetMin: 0 }), now, now - 7 * DAY);
    expect(r).not.toBeNull();
    expect(r!.freeNights).toBeGreaterThanOrEqual(6);
    expect(r!.msfsc).toBeGreaterThan(4);
    expect(r!.offsetMin).toBeGreaterThan(0);
    expect(r!.offsetMin).toBeLessThanOrEqual(15 + 1e-9);
    expect(r!.changed).toBe(true);
    expect(r!.socialJetlagHours).toBeGreaterThan(1.5);
    const two = learnChronotype(twentyFiveNights(), makeProfile({ circadianPhaseOffsetMin: 0 }), now, now - 14 * DAY);
    expect(two!.offsetMin).toBeLessThanOrEqual(30 + 1e-9);
    expect(two!.offsetMin).toBeGreaterThan(r!.offsetMin);
    const none = learnChronotype(twentyFiveNights(), makeProfile({ circadianPhaseOffsetMin: 0 }), now, now);
    expect(none!.changed).toBe(false);
  });

  it('assumes one week since the last update when unknown, and works without work days', () => {
    const r = learnChronotype(twentyFiveNights(), makeProfile(), now);
    expect(Math.abs(r!.offsetMin)).toBeLessThanOrEqual(15 + 1e-9);
    const freeOnly = Array.from({ length: 25 }, (_, i) => night(addDaysToKey('2025-05-14', -i), '00:00', '08:00'));
    const p = makeProfile({ workSchedule: { workDays: [], workStart: '', workEnd: '', shiftMode: false } });
    expect(learnChronotype(freeOnly, p, now)).not.toBeNull();
  });
});
