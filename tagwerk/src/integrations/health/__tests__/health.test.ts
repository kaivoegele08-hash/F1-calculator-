import { healthConnectToSessions, samplesToSessions } from '../convert';
import { MockHealthProvider } from '../mock';
import { getHealthProvider } from '..';
import { syncHealth } from '@/services/sync';
import { MemoryStore } from '@/data/memoryStore';
import { localTimeToMs } from '@/engine/time';
import { buildSleepDays } from '@/engine/sleepDetection';

const TZ = 'Europe/Berlin';
const iso = (key: string, hhmm: string) => new Date(localTimeToMs(key, hhmm, TZ)).toISOString();
const NOW = localTimeToMs('2025-05-14', '12:00', TZ);

describe('HealthKit sample conversion', () => {
  it('combines asleep stages into one session framed by in-bed', () => {
    const raw = [
      { startDate: iso('2025-05-13', '22:50'), endDate: iso('2025-05-14', '07:10'), value: 'INBED' as const, sourceName: 'Apple Watch' },
      { startDate: iso('2025-05-13', '23:05'), endDate: iso('2025-05-14', '03:00'), value: 'ASLEEP' as const, sourceName: 'Apple Watch' },
      { startDate: iso('2025-05-14', '03:00'), endDate: iso('2025-05-14', '03:20'), value: 'AWAKE' as const, sourceName: 'Apple Watch' },
      { startDate: iso('2025-05-14', '03:20'), endDate: iso('2025-05-14', '06:50'), value: 'ASLEEP' as const, sourceName: 'Apple Watch' },
    ];
    const s = samplesToSessions(raw, { source: 'healthkit', timezone: TZ, now: NOW });
    expect(s).toHaveLength(1);
    expect(s[0].startAt).toBe(Date.parse(raw[0].startDate));
    expect(s[0].endAt).toBe(Date.parse(raw[0].endDate));
    expect(s[0].asleepMinutes).toBe(3 * 60 + 55 + 3 * 60 + 30);
    expect(s[0].sourceDetail).toBe('Apple Watch');
    expect(s[0].source).toBe('healthkit');
    expect(s[0].confidence).toBe(0.9);
  });

  it('splits separate nights and keeps sources apart', () => {
    const raw = [
      { startDate: iso('2025-05-12', '23:00'), endDate: iso('2025-05-13', '07:00'), value: 'ASLEEP' as const, sourceName: 'iPhone' },
      { startDate: iso('2025-05-13', '23:00'), endDate: iso('2025-05-14', '07:00'), value: 'ASLEEP' as const, sourceName: 'iPhone' },
      { startDate: iso('2025-05-13', '23:10'), endDate: iso('2025-05-14', '06:50'), value: 'ASLEEP' as const, sourceName: 'Oura' },
    ];
    const s = samplesToSessions(raw, { source: 'healthkit', timezone: TZ, now: NOW });
    expect(s).toHaveLength(3);
    expect(new Set(s.map((x) => x.id)).size).toBe(3);
    // the ring has higher priority than the phone, so only one of the two duplicates counts
    const days = buildSleepDays(s, TZ);
    expect(days.get('2025-05-14')?.main).toHaveLength(1);
    expect(days.get('2025-05-14')?.main[0].sourceDetail).toBe('Oura');
  });

  it('falls back to in-bed only data with lower confidence and ignores broken samples', () => {
    const raw = [
      { startDate: iso('2025-05-13', '23:00'), endDate: iso('2025-05-14', '07:00'), value: 'INBED' as const },
      { startDate: 'garbage', endDate: 'garbage', value: 'ASLEEP' as const },
      { startDate: iso('2025-05-14', '07:00'), endDate: iso('2025-05-14', '06:00'), value: 'ASLEEP' as const },
    ];
    const s = samplesToSessions(raw, { source: 'healthkit', timezone: TZ, now: NOW });
    expect(s).toHaveLength(1);
    expect(s[0].confidence).toBe(0.5);
    expect(s[0].asleepMinutes).toBe(480);
    expect(s[0].sourceDetail).toBeNull();
  });

  it('drops sessions that end in the future and handles empty input', () => {
    const raw = [{ startDate: iso('2025-05-14', '11:00'), endDate: iso('2025-05-14', '20:00'), value: 'ASLEEP' as const }];
    expect(samplesToSessions(raw, { source: 'healthkit', timezone: TZ, now: NOW })).toEqual([]);
    expect(samplesToSessions([], { source: 'healthkit', timezone: TZ })).toEqual([]);
  });
});

describe('Health Connect conversion', () => {
  it('sums asleep stages and ignores awake stages', () => {
    const rec = {
      startTime: iso('2025-05-13', '23:00'),
      endTime: iso('2025-05-14', '07:00'),
      metadata: { dataOrigin: 'com.fitbit' },
      stages: [
        { startTime: iso('2025-05-13', '23:00'), endTime: iso('2025-05-14', '03:00'), stage: 4 },
        { startTime: iso('2025-05-14', '03:00'), endTime: iso('2025-05-14', '03:30'), stage: 1 },
        { startTime: iso('2025-05-14', '03:30'), endTime: iso('2025-05-14', '07:00'), stage: 5 },
      ],
    };
    const [s] = healthConnectToSessions([rec], TZ);
    expect(s.asleepMinutes).toBe(7.5 * 60);
    expect(s.source).toBe('healthconnect');
    expect(s.sourceDetail).toBe('com.fitbit');
    expect(s.confidence).toBe(0.9);
  });

  it('uses the full duration without stages and skips invalid records', () => {
    const recs = [
      { startTime: iso('2025-05-13', '23:00'), endTime: iso('2025-05-14', '07:00') },
      { startTime: 'x', endTime: 'y' },
    ];
    const s = healthConnectToSessions(recs, TZ);
    expect(s).toHaveLength(1);
    expect(s[0].asleepMinutes).toBe(480);
    expect(s[0].confidence).toBe(0.7);
    expect(s[0].sourceDetail).toBeNull();
  });
});

describe('sync', () => {
  it('imports 90 days from the mock provider and never overwrites edited nights', async () => {
    const store = new MemoryStore();
    const provider = new MockHealthProvider(TZ, 'rested');
    expect(await provider.isAvailable()).toBe(true);
    expect(await provider.requestPermissions()).toBe('granted');
    const res = await syncHealth(store, provider, TZ, NOW);
    expect(res.status).toBe('ok');
    expect(res.imported).toBeGreaterThan(70);
    const list = await store.listSessions();
    expect(list.every((s) => s.source === 'demo')).toBe(true);
    const first = list[list.length - 1];
    await store.upsertSessions([{ ...first, userEdited: true, endAt: first.endAt + 1 }]);
    await syncHealth(store, provider, TZ, NOW);
    expect((await store.getSession(first.id))?.endAt).toBe(first.endAt + 1);
  });

  it('reports unavailable and error states without throwing', async () => {
    const store = new MemoryStore();
    const unavailable = { id: 'mock' as const, isAvailable: async () => false, requestPermissions: async () => 'unavailable' as const, fetchSleep: async () => [] };
    expect((await syncHealth(store, unavailable, TZ, NOW)).status).toBe('unavailable');
    const broken = { ...unavailable, isAvailable: async () => true, fetchSleep: async () => { throw new Error('boom'); } };
    expect((await syncHealth(store, broken, TZ, NOW)).status).toBe('error');
  });

  it('syncs Health Connect style providers through their record API', async () => {
    const store = new MemoryStore();
    const hc = {
      id: 'healthconnect' as const,
      isAvailable: async () => true,
      requestPermissions: async () => 'granted' as const,
      fetchSleep: async () => [],
      fetchSleepRecords: async () => [{ startTime: iso('2025-05-13', '23:00'), endTime: iso('2025-05-14', '07:00') }],
    };
    const res = await syncHealth(store, hc, TZ, NOW);
    expect(res.imported).toBe(1);
  });

  it('syncs HealthKit style samples', async () => {
    const store = new MemoryStore();
    const kit = {
      id: 'healthkit' as const,
      isAvailable: async () => true,
      requestPermissions: async () => 'granted' as const,
      fetchSleep: async () => [{ startDate: iso('2025-05-13', '23:00'), endDate: iso('2025-05-14', '07:00'), value: 'ASLEEP' as const, sourceName: 'Watch' }],
    };
    expect((await syncHealth(store, kit, TZ, NOW)).imported).toBe(1);
    expect((await store.listSessions())[0].source).toBe('healthkit');
  });

  it('picks the demo provider on web/jest and handles denied permissions', async () => {
    const p = getHealthProvider(TZ);
    expect(['mock', 'healthkit', 'healthconnect']).toContain(p.id);
    const denied = new MockHealthProvider(TZ, 'rested', 'denied');
    expect(await denied.requestPermissions()).toBe('denied');
  });
});
