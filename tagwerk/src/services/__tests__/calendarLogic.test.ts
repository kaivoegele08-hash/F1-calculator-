import { findConflicts, type CalendarItem } from '../calendarLogic';
import { localTimeToMs } from '@/engine/time';
import type { DayWindow } from '@/engine/types';

const TZ = 'Europe/Berlin';
const at = (h: string) => localTimeToMs('2025-05-14', h, TZ);
const dip: DayWindow = { kind: 'afternoon_dip', start: at('14:00'), end: at('15:30'), point: false };
const peak: DayWindow = { kind: 'morning_peak', start: at('09:30'), end: at('11:00'), point: false };
const stop: DayWindow = { kind: 'caffeine_stop', start: at('14:30'), end: at('14:30'), point: true };
const ev = (id: string, s: string, e: string, extra: Partial<CalendarItem> = {}): CalendarItem => ({ id, title: id, start: at(s), end: at(e), ...extra });

describe('calendar conflicts', () => {
  it('flags a meeting inside the afternoon dip', () => {
    const c = findConflicts([ev('m', '14:30', '15:30')], [peak, dip], TZ);
    expect(c).toHaveLength(1);
    expect(c[0].message).toBe('Dein Termin um 14:30 liegt im Nachmittagstief.');
  });

  it('ignores meetings in a peak, all-day events, point windows and small overlaps', () => {
    expect(findConflicts([ev('a', '09:45', '10:30')], [peak, dip], TZ)).toEqual([]);
    expect(findConflicts([ev('b', '00:00', '23:59', { allDay: true })], [dip], TZ)).toEqual([]);
    expect(findConflicts([ev('c', '14:20', '14:40')], [stop], TZ)).toEqual([]);
    expect(findConflicts([ev('d', '15:25', '17:00')], [dip], TZ)).toEqual([]);
  });

  it('flags the groggy phase as well and reports each event once', () => {
    const groggy: DayWindow = { kind: 'grogginess', start: at('07:00'), end: at('08:15'), point: false };
    const c = findConflicts([ev('e', '07:30', '08:00')], [groggy, dip], TZ);
    expect(c).toHaveLength(1);
    expect(c[0].message).toContain('Benommenheit');
  });
});
