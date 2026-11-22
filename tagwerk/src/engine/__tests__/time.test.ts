import {
  addDaysToKey,
  circularMeanHours,
  dateKey,
  dayOfWeekOfKey,
  formatClock,
  formatDuration,
  formatHHmm,
  hourOfDay,
  localTimeToMs,
  makeClock,
  mean,
  median,
  parseHHmm,
  percentile,
  stddev,
  tzOffsetMin,
  wrapMin,
} from '../time';
import { TZ } from './fixtures';

describe('time helpers', () => {
  it('maps UTC instants to local date keys across midnight', () => {
    const ms = Date.UTC(2025, 5, 1, 22, 30); // 00:30 on 2 June in Berlin (CEST)
    expect(dateKey(ms, TZ)).toBe('2025-06-02');
    expect(dateKey(ms, 'UTC')).toBe('2025-06-01');
    expect(formatClock(ms, TZ)).toBe('00:30');
    expect(hourOfDay(ms, TZ)).toBeCloseTo(0.5);
  });

  it('round-trips local wall-clock times', () => {
    const ms = localTimeToMs('2025-03-15', '07:15', TZ);
    expect(formatClock(ms, TZ)).toBe('07:15');
    expect(dateKey(ms, TZ)).toBe('2025-03-15');
  });

  it('handles date key arithmetic', () => {
    expect(addDaysToKey('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDaysToKey('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysToKey('2025-01-01', -1)).toBe('2024-12-31');
    expect(dayOfWeekOfKey('2025-06-01')).toBe(0);
  });

  it('formats clock hours and durations', () => {
    expect(formatHHmm(7.5)).toBe('07:30');
    expect(formatHHmm(25)).toBe('01:00');
    expect(formatHHmm(-1)).toBe('23:00');
    expect(parseHHmm('06:45')).toBeCloseTo(6.75);
    expect(parseHHmm('7')).toBe(7);
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(400)).toBe('6 h 40 min');
  });

  it('wraps minute differences', () => {
    expect(wrapMin(0)).toBe(0);
    expect(wrapMin(1430)).toBe(-10);
    expect(wrapMin(-1430)).toBe(10);
    expect(wrapMin(720)).toBe(720);
  });

  it('computes statistics', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNaN();
    expect(percentile([1, 2, 3, 4, 5], 0.8)).toBeCloseTo(4.2);
    expect(percentile([], 0.5)).toBeNaN();
    expect(mean([2, 4])).toBe(3);
    expect(stddev([1])).toBe(0);
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2);
    expect(circularMeanHours([23, 1])).toBeCloseTo(0, 5);
    expect(circularMeanHours([3, 5])).toBeCloseTo(4);
  });

  it('knows the UTC offset including daylight saving time', () => {
    expect(tzOffsetMin(Date.UTC(2025, 0, 15), TZ)).toBe(60);
    expect(tzOffsetMin(Date.UTC(2025, 6, 15), TZ)).toBe(120);
  });

  it('local clock stays correct across the spring DST change in Europe/Berlin', () => {
    const clock = makeClock(TZ);
    const before = Date.UTC(2025, 2, 30, 0, 30); // 01:30 CET
    const after = Date.UTC(2025, 2, 30, 1, 30); // 03:30 CEST
    expect(clock(before)).toBeCloseTo(1.5);
    expect(clock(after)).toBeCloseTo(3.5);
  });
});
