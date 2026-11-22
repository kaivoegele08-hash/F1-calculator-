import { dateKey } from '@/engine/time';
import { generateDemoSessions, type DemoScenarioId } from '@/data/demo/generator';
import type { HealthProvider, PermissionResult, RawSleepSample } from './types';

/** Mock provider backed by the demo generator (web preview, tests, declined permissions). */
export class MockHealthProvider implements HealthProvider {
  readonly id = 'mock' as const;
  constructor(
    private timezone: string,
    private scenario: DemoScenarioId = 'rested',
    private grant: PermissionResult = 'granted',
  ) {}
  async isAvailable() {
    return true;
  }
  async requestPermissions(): Promise<PermissionResult> {
    return this.grant;
  }
  async fetchSleep(from: Date, to: Date): Promise<RawSleepSample[]> {
    const lastKey = dateKey(to.getTime(), this.timezone);
    const sessions = generateDemoSessions({
      scenario: this.scenario,
      lastWakeKey: lastKey,
      tz: this.timezone,
      nights: Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000)),
    });
    const out: RawSleepSample[] = [];
    for (const s of sessions) {
      if (s.endAt > to.getTime() || s.startAt < from.getTime()) continue;
      out.push({
        startDate: new Date(s.startAt).toISOString(),
        endDate: new Date(s.endAt).toISOString(),
        value: 'INBED',
        sourceName: 'Demo',
      });
      out.push({
        startDate: new Date(s.startAt + 12 * 60_000).toISOString(),
        endDate: new Date(s.endAt - 5 * 60_000).toISOString(),
        value: 'ASLEEP',
        sourceName: 'Demo',
      });
    }
    return out;
  }
}

