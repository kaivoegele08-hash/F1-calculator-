import {
  buildSleepDays,
  classifyNaps,
  dedupeBySource,
  mergeSessions,
  sleepIntervals,
  sourcePriority,
} from '../sleepDetection';
import { localTimeToMs } from '../time';
import { nap, night, TZ } from './fixtures';

describe('source priority and deduplication', () => {
  it('ranks userEdited > wearable > phone > manual', () => {
    const base = night('2025-05-10', '23:00', '07:00');
    expect(sourcePriority({ ...base, userEdited: true, source: 'manual' })).toBe(4);
    expect(sourcePriority({ ...base, source: 'healthkit', sourceDetail: 'Apple Watch' })).toBe(3);
    expect(sourcePriority({ ...base, source: 'healthkit', sourceDetail: 'iPhone' })).toBe(2);
    expect(sourcePriority({ ...base, source: 'phone_inferred' })).toBe(2);
    expect(sourcePriority({ ...base, source: 'healthconnect' })).toBe(3);
    expect(sourcePriority({ ...base, source: 'demo' })).toBe(3);
    expect(sourcePriority({ ...base, source: 'manual' })).toBe(1);
  });

  it('drops lower priority sessions that duplicate a better source', () => {
    const watch = night('2025-05-10', '23:10', '06:50', { source: 'healthkit', sourceDetail: 'Apple Watch' });
    const manual = night('2025-05-10', '23:00', '07:00', { source: 'manual' });
    const edited = night('2025-05-10', '22:30', '07:30', { source: 'manual', userEdited: true });
    expect(dedupeBySource([watch, manual])).toEqual([watch]);
    expect(dedupeBySource([watch, manual, edited])).toEqual([edited]);
    const other = night('2025-05-11', '23:00', '07:00', { source: 'manual' });
    expect(dedupeBySource([watch, other])).toHaveLength(2);
  });

  it('ignores zero-length sessions', () => {
    const s = night('2025-05-10', '23:00', '07:00');
    expect(dedupeBySource([{ ...s, endAt: s.startAt }])).toHaveLength(0);
  });
});

describe('merging', () => {
  it('merges sessions separated by <= 45 minutes of wakefulness', () => {
    const a = night('2025-05-10', '23:00', '03:00', { asleepMinutes: 230 });
    const b = night('2025-05-10', '03:30', '07:00', { asleepMinutes: 200 });
    const merged = mergeSessions([b, a]);
    expect(merged).toHaveLength(1);
    expect(merged[0].startAt).toBe(a.startAt);
    expect(merged[0].endAt).toBe(b.endAt);
    // wake gap is not counted as sleep
    expect(merged[0].asleepMinutes).toBeLessThan((b.endAt - a.startAt) / 60000);
  });

  it('keeps sessions apart when the gap is larger than 45 minutes', () => {
    const a = night('2025-05-10', '23:00', '03:00');
    const b = night('2025-05-10', '04:00', '07:00');
    expect(mergeSessions([a, b])).toHaveLength(2);
  });

  it('merges overlapping sessions without double counting', () => {
    const a = night('2025-05-10', '23:00', '06:00');
    const b = night('2025-05-10', '01:00', '07:00');
    const [m] = mergeSessions([a, b]);
    expect(m.asleepMinutes).toBe(8 * 60);
    expect(m.userEdited).toBe(false);
  });

  it('marks merged sessions as user edited if any part was', () => {
    const a = night('2025-05-10', '23:00', '03:00', { userEdited: true });
    const b = night('2025-05-10', '03:20', '07:00');
    expect(mergeSessions([a, b])[0].userEdited).toBe(true);
  });
});

describe('nap classification', () => {
  it('classifies short daytime sessions as naps', () => {
    const n = night('2025-05-10', '23:00', '07:00');
    const p = nap('2025-05-10', '14:00', '14:30');
    const early = nap('2025-05-10', '07:30', '08:30');
    const [a, b, c] = classifyNaps([n, early, p].sort((x, y) => x.startAt - y.startAt), TZ).sort((x, y) => x.startAt - y.startAt);
    expect(a.isNap).toBe(false);
    expect(c.isNap).toBe(true);
    expect(b.isNap).toBe(false);
  });

  it('does not call a 4 h session a nap', () => {
    const s = nap('2025-05-10', '12:00', '16:00');
    expect(classifyNaps([s], TZ)[0].isNap).toBe(false);
  });

  it('respects the user flag on edited sessions', () => {
    const s = nap('2025-05-10', '12:00', '16:00', { userEdited: true, isNap: true });
    expect(classifyNaps([s], TZ)[0].isNap).toBe(true);
  });

  it('shift mode classifies relative to the main sleep phase', () => {
    // Night worker sleeps 08:00-15:00, naps 21:00-21:30 before the shift
    const main1 = night('2025-05-10', '08:00', '15:00');
    const short = nap('2025-05-10', '21:00', '21:30');
    const main2 = night('2025-05-11', '08:00', '15:00');
    const res = classifyNaps([main1, short, main2], TZ, true);
    expect(res[1].isNap).toBe(true);
    expect(classifyNaps([main1, short, main2], TZ, false)[1].isNap).toBe(false);
    // a short session right after main sleep and with nothing after is not a nap
    expect(classifyNaps([main1, nap('2025-05-10', '15:30', '16:00')], TZ, true)[1].isNap).toBe(false);
    // with no previous main session nothing is a nap in shift mode
    expect(classifyNaps([nap('2025-05-10', '21:00', '21:30')], TZ, true)[0].isNap).toBe(false);
  });

  it('shift mode with no later main session needs 4 h distance', () => {
    const main = night('2025-05-10', '08:00', '15:00');
    expect(classifyNaps([main, nap('2025-05-10', '20:30', '21:00')], TZ, true)[1].isNap).toBe(true);
  });
});

describe('sleep days', () => {
  it('assigns the main sleep to the wake date, also across midnight', () => {
    const n = night('2025-05-10', '23:30', '07:30');
    const days = buildSleepDays([n], TZ);
    expect([...days.keys()]).toEqual(['2025-05-10']);
    expect(days.get('2025-05-10')?.mainMinutes).toBe(480);
    expect(days.get('2025-05-10')?.bedAt).toBe(n.startAt);
  });

  it('keeps naps separate from the main sleep', () => {
    const days = buildSleepDays(
      [night('2025-05-10', '23:00', '07:00'), nap('2025-05-10', '14:00', '14:20')],
      TZ,
    );
    const d = days.get('2025-05-10');
    expect(d?.mainMinutes).toBe(480);
    expect(d?.napMinutes).toBe(20);
    expect(d?.naps).toHaveLength(1);
  });

  it('adds up two long segments of one night', () => {
    const days = buildSleepDays(
      [night('2025-05-10', '22:00', '02:00'), night('2025-05-10', '03:30', '07:30')],
      TZ,
    );
    expect(days.get('2025-05-10')?.mainMinutes).toBe(480);
    expect(sleepIntervals([night('2025-05-10', '22:00', '02:00')], TZ)).toHaveLength(1);
  });

  it('handles the DST night in spring (one hour shorter)', () => {
    // 29/30 March 2025: 02:00 -> 03:00 skipped in Europe/Berlin
    const s = { ...night('2025-03-30', '23:00', '07:00'), startAt: localTimeToMs('2025-03-29', '23:00', TZ), endAt: localTimeToMs('2025-03-30', '07:00', TZ) };
    const d = buildSleepDays([s], TZ).get('2025-03-30');
    expect(d?.mainMinutes).toBe(7 * 60);
  });

  it('handles the DST night in autumn (one hour longer)', () => {
    const s = { ...night('2025-10-26', '23:00', '07:00'), startAt: localTimeToMs('2025-10-25', '23:00', TZ), endAt: localTimeToMs('2025-10-26', '07:00', TZ) };
    const d = buildSleepDays([s], TZ).get('2025-10-26');
    expect(d?.mainMinutes).toBe(9 * 60);
  });
});
