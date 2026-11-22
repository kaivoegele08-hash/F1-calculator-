import { Platform } from 'react-native';
import type { HealthProvider, PermissionResult, RawSleepSample, RawStepSample } from './types';

function loadKit(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // Loaded lazily so Expo Go / web never touch the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-health');
    return mod?.default ?? mod ?? null;
  } catch {
    return null;
  }
}

const SLEEP_VALUE: Record<string, RawSleepSample['value']> = {
  INBED: 'INBED',
  ASLEEP: 'ASLEEP',
  AWAKE: 'AWAKE',
  CORE: 'ASLEEP',
  DEEP: 'ASLEEP',
  REM: 'ASLEEP',
  UNSPECIFIED: 'ASLEEP',
};

/** HealthKit provider via react-native-health (requires a development build). */
export class HealthKitProvider implements HealthProvider {
  readonly id = 'healthkit' as const;
  private kit = loadKit();

  async isAvailable(): Promise<boolean> {
    if (!this.kit) return false;
    return new Promise((resolve) => {
      try {
        this.kit.isAvailable((err: unknown, ok: boolean) => resolve(!err && !!ok));
      } catch {
        resolve(false);
      }
    });
  }

  async requestPermissions(): Promise<PermissionResult> {
    if (!this.kit) return 'unavailable';
    return new Promise((resolve) => {
      try {
        const P = this.kit.Constants.Permissions;
        this.kit.initHealthKit(
          { permissions: { read: [P.SleepAnalysis, P.StepCount], write: [] } },
          (err: unknown) => resolve(err ? 'denied' : 'granted'),
        );
      } catch {
        resolve('unavailable');
      }
    });
  }

  async fetchSleep(from: Date, to: Date): Promise<RawSleepSample[]> {
    if (!this.kit) return [];
    return new Promise((resolve) => {
      try {
        this.kit.getSleepSamples(
          { startDate: from.toISOString(), endDate: to.toISOString(), limit: 10000, ascending: true },
          (err: unknown, results: any[]) => {
            if (err || !Array.isArray(results)) return resolve([]);
            const out: RawSleepSample[] = [];
            for (const r of results) {
              const value = SLEEP_VALUE[String(r.value).toUpperCase()];
              if (!value) continue;
              out.push({
                startDate: r.startDate,
                endDate: r.endDate,
                value,
                sourceName: r.sourceName ?? undefined,
              });
            }
            resolve(out);
          },
        );
      } catch {
        resolve([]);
      }
    });
  }

  async fetchSteps(from: Date, to: Date): Promise<RawStepSample[]> {
    if (!this.kit) return [];
    return new Promise((resolve) => {
      try {
        this.kit.getDailyStepCountSamples(
          { startDate: from.toISOString(), endDate: to.toISOString() },
          (err: unknown, results: any[]) =>
            resolve(
              err || !Array.isArray(results)
                ? []
                : results.map((r) => ({ startDate: r.startDate, endDate: r.endDate, steps: r.value })),
            ),
        );
      } catch {
        resolve([]);
      }
    });
  }
}
