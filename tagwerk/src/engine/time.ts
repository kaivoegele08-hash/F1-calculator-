import { fromZonedTime } from 'date-fns-tz';
import { HOUR, MIN } from './constants';

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function localParts(ms: number, tz: string): LocalParts {
  const out: Record<string, number> = {};
  for (const p of fmt(tz).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = parseInt(p.value, 10);
  }
  return out as unknown as LocalParts;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** YYYY-MM-DD in the given zone. */
export function dateKey(ms: number, tz: string): string {
  const p = localParts(ms, tz);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Local clock hour of day as a fraction (e.g. 7.5 = 07:30). */
export function hourOfDay(ms: number, tz: string): number {
  const p = localParts(ms, tz);
  return p.hour + p.minute / 60 + p.second / 3600;
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function dayOfWeekOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** UTC ms of a local wall-clock time ("HH:mm") on a local date key. */
export function localTimeToMs(key: string, hhmm: string, tz: string): number {
  return fromZonedTime(`${key}T${hhmm.length === 5 ? hhmm : `0${hhmm}`}:00`, tz).getTime();
}

export function parseHHmm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h + (m || 0) / 60;
}

export function formatHHmm(hours: number): string {
  const total = Math.round((((hours % 24) + 24) % 24) * 60) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatClock(ms: number, tz: string): string {
  const p = localParts(ms, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDuration(minutes: number): string {
  const total = Math.round(Math.abs(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${pad(m)} min`;
}

/** UTC offset of a zone at an instant, in minutes. */
export function tzOffsetMin(ms: number, tz: string): number {
  const p = localParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / MIN);
}

/** Cached local-clock helper: hour-of-day for many nearby timestamps cheaply. */
export function makeClock(tz: string): (ms: number) => number {
  const cache = new Map<number, number>();
  return (ms: number) => {
    const bucket = Math.floor(ms / HOUR);
    let off = cache.get(bucket);
    if (off === undefined) {
      off = tzOffsetMin(bucket * HOUR + 30 * MIN, tz);
      cache.set(bucket, off);
    }
    const local = ms + off * MIN;
    const h = (((local / HOUR) % 24) + 24) % 24;
    return h;
  };
}

/** Wrap a minute difference into (-720, 720]. */
export function wrapMin(d: number): number {
  let x = ((d % 1440) + 1440) % 1440;
  if (x > 720) x -= 1440;
  return x;
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Circular mean of clock hours (0..24). */
export function circularMeanHours(hours: number[]): number {
  let sx = 0;
  let sy = 0;
  for (const h of hours) {
    const a = (h / 24) * 2 * Math.PI;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  const ang = Math.atan2(sy, sx);
  return ((((ang / (2 * Math.PI)) * 24) % 24) + 24) % 24;
}
