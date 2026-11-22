import { buildCurve, energyAt, extremumWindow, findFeatures, grogginessEndAfter, normalizeEnergy } from '../energyCurve';
import { DAY, HOUR, MIN } from '../constants';
import { sleepIntervals } from '../sleepDetection';
import { formatClock, localTimeToMs } from '../time';
import { constantNights, TZ } from './fixtures';

const TODAY = '2025-05-14';
const wakeAt = localTimeToMs(TODAY, '07:00', TZ);

function curveFor(opts: { debt?: number; offset?: number; sessions?: ReturnType<typeof constantNights> } = {}) {
  const sessions = opts.sessions ?? constantNights(TODAY, 20, 480);
  return buildCurve({
    intervals: sleepIntervals(sessions, TZ),
    wakeAt,
    from: wakeAt - 14 * DAY,
    tz: TZ,
    offsetMin: opts.offset ?? 0,
    debtMinutes: opts.debt ?? 0,
  });
}

const bed = localTimeToMs(TODAY, '23:00', TZ);
const mel = localTimeToMs(TODAY, '22:30', TZ);

describe('energy curve', () => {
  it('has 5-minute steps over 24 h and stays within 0..100', () => {
    const c = curveFor();
    expect(c.points).toHaveLength(289);
    expect(c.points[1].t - c.points[0].t).toBe(5 * MIN);
    for (const p of c.points) {
      expect(p.energy).toBeGreaterThanOrEqual(0);
      expect(p.energy).toBeLessThanOrEqual(100);
    }
  });

  it('starts low (groggy) and recovers', () => {
    const c = curveFor();
    expect(c.points[0].energy).toBeLessThan(10);
    expect(energyAt(c.points, wakeAt + 3 * HOUR)).toBeGreaterThan(55);
  });

  it('finds morning peak before afternoon dip before evening peak', () => {
    const c = curveFor();
    const f = findFeatures({ curve: c, debtMinutes: 0, awakeEnd: bed, melatoninStart: mel });
    expect(f.heuristic).toBe(false);
    const mp = (f.morningPeak.start + f.morningPeak.end) / 2;
    const dip = (f.afternoonDip.start + f.afternoonDip.end) / 2;
    const ev = (f.eveningPeak.start + f.eveningPeak.end) / 2;
    expect(mp).toBeLessThan(dip);
    expect(dip).toBeLessThan(ev);
    expect((mp - wakeAt) / HOUR).toBeGreaterThanOrEqual(1.5);
    expect((mp - wakeAt) / HOUR).toBeLessThanOrEqual(5);
    expect((dip - wakeAt) / HOUR).toBeGreaterThanOrEqual(5.5);
    expect((dip - wakeAt) / HOUR).toBeLessThanOrEqual(9.5);
    expect((mel - ev) / HOUR).toBeGreaterThanOrEqual(1.5);
    expect((mel - ev) / HOUR).toBeLessThanOrEqual(4.5);
    expect(energyAt(c.points, mp)).toBeGreaterThan(energyAt(c.points, dip));
    expect(energyAt(c.points, ev)).toBeGreaterThan(energyAt(c.points, dip));
  });

  it('windows last between 45 and 150 minutes and lie within the day', () => {
    const c = curveFor();
    const f = findFeatures({ curve: c, debtMinutes: 0, awakeEnd: bed, melatoninStart: mel });
    for (const w of [f.morningPeak, f.afternoonDip, f.eveningPeak]) {
      const len = (w.end - w.start) / MIN;
      expect(len).toBeGreaterThanOrEqual(45 - 1e-6);
      expect(len).toBeLessThanOrEqual(150 + 1e-6);
      expect(w.start).toBeGreaterThanOrEqual(wakeAt);
      expect(w.end).toBeLessThanOrEqual(bed);
    }
    expect(f.grogginessEnd - wakeAt).toBeGreaterThanOrEqual(60 * MIN);
    expect(f.grogginessEnd - wakeAt).toBeLessThanOrEqual(95 * MIN);
  });

  it('grogginess lasts longer with sleep debt', () => {
    expect(grogginessEndAfter(900, 0)).toBeGreaterThan(grogginessEndAfter(0, 0));
    expect(grogginessEndAfter(0, 1)).toBeGreaterThan(grogginessEndAfter(0, 0));
  });

  it('a high debt day is lower than a rested day on the same fixed scale', () => {
    const rested = curveFor({ debt: 0 });
    const tired = curveFor({ debt: 900 });
    const avg = (c: typeof rested) => c.points.slice(24, 180).reduce((a, p) => a + p.energy, 0) / 156;
    expect(avg(tired)).toBeLessThan(avg(rested) - 3);
  });

  it('a short night lowers the day', () => {
    const short = curveFor({ sessions: constantNights(TODAY, 20, 480).map((s, i) => (i === 0 ? { ...s, startAt: s.endAt - 4 * HOUR } : s)) });
    const rested = curveFor();
    expect(energyAt(short.points, wakeAt + 8 * HOUR)).toBeLessThan(energyAt(rested.points, wakeAt + 8 * HOUR));
  });

  it('a late chronotype shifts the evening peak later', () => {
    const late = curveFor({ offset: 120 });
    const norm = curveFor();
    const fl = findFeatures({ curve: late, debtMinutes: 0, awakeEnd: bed + 2 * HOUR, melatoninStart: mel + 2 * HOUR });
    const fn = findFeatures({ curve: norm, debtMinutes: 0, awakeEnd: bed + 2 * HOUR, melatoninStart: mel + 2 * HOUR });
    expect(fl.eveningPeak.start).toBeGreaterThan(fn.eveningPeak.start);
  });

  it('falls back to heuristics when the curve has no clear shape', () => {
    const c = curveFor();
    const flat = { ...c, points: c.points.map((p) => ({ ...p, energy: 50 })) };
    const f = findFeatures({ curve: flat, debtMinutes: 0, awakeEnd: bed, melatoninStart: mel });
    expect(f.heuristic).toBe(true);
    expect(f.morningPeak.start).toBeLessThan(f.afternoonDip.start);
    expect(f.afternoonDip.start).toBeLessThan(f.eveningPeak.start);
    expect(formatClock(f.eveningPeak.start, TZ)).toMatch(/^\d\d:\d\d$/);
  });

  it('expands very narrow extrema to 45 minutes and trims wide plateaus to 150', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ t: wakeAt + i * 5 * MIN, energy: i === 50 ? 80 : 40 }));
    const w = extremumWindow(pts, 50, 'max', pts[0].t, pts[99].t);
    expect((w.end - w.start) / MIN).toBe(45);
    const flat = pts.map((p) => ({ ...p, energy: 60 }));
    const w2 = extremumWindow(flat, 50, 'max', flat[0].t, flat[99].t);
    expect((w2.end - w2.start) / MIN).toBeLessThanOrEqual(150);
    const minW = extremumWindow(pts.map((p, i) => ({ ...p, energy: i === 50 ? 10 : 50 })), 50, 'min', pts[0].t, pts[99].t);
    expect(minW.start).toBeLessThan(minW.end);
  });

  it('normalises on a fixed scale', () => {
    expect(normalizeEnergy(-10)).toBe(0);
    expect(normalizeEnergy(10)).toBe(100);
    expect(normalizeEnergy(-0.3)).toBeGreaterThan(normalizeEnergy(-0.4));
  });

  it('interpolates energyAt and clamps outside the range', () => {
    const pts = [
      { t: 0, energy: 0 },
      { t: 5 * MIN, energy: 10 },
    ];
    expect(energyAt(pts, 2.5 * MIN)).toBeCloseTo(5);
    expect(energyAt(pts, -1)).toBe(0);
    expect(energyAt(pts, 99 * MIN)).toBe(10);
    expect(energyAt([], 0)).toBe(0);
  });
});
