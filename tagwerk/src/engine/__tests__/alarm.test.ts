import { suggestWakeTime } from '../alarm';
import { MIN } from '../constants';
import { formatClock, localTimeToMs } from '../time';
import { TZ } from './fixtures';

const at = (h: string, key = '2025-05-14') => localTimeToMs(key, h, TZ);

describe('gentle alarm', () => {
  it('picks the last 90-minute cycle end inside the span', () => {
    // onset 23:00 -> cycle ends 00:30, 02:00, 03:30, 05:00, 06:30, 08:00
    const s = suggestWakeTime(at('23:00'), at('06:00', '2025-05-15'), at('07:00', '2025-05-15'));
    expect(formatClock(s.wakeAt, TZ)).toBe('06:30');
    expect(s.cycles).toBe(5);
    expect(s.aligned).toBe(true);
  });

  it('prefers the latest cycle end when two fit into a long span', () => {
    const s = suggestWakeTime(at('23:00'), at('05:00', '2025-05-15'), at('08:00', '2025-05-15'));
    expect(formatClock(s.wakeAt, TZ)).toBe('08:00');
    expect(s.cycles).toBe(6);
  });

  it('falls back to the end of the span when no cycle ends inside it', () => {
    const s = suggestWakeTime(at('23:00'), at('06:40', '2025-05-15'), at('06:55', '2025-05-15'));
    expect(s.aligned).toBe(false);
    expect(formatClock(s.wakeAt, TZ)).toBe('06:55');
    expect(s.cycles).toBe(5);
  });

  it('never suggests a time before the first cycle completes', () => {
    const s = suggestWakeTime(at('23:00'), at('23:10'), at('23:40'));
    expect(s.aligned).toBe(false);
    expect(s.cycles).toBe(0);
    expect(s.wakeAt).toBe(at('23:40'));
    expect(s.wakeAt - at('23:00')).toBe(40 * MIN);
  });
});
