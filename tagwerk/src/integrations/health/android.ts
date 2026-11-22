import { Platform } from 'react-native';
import type { HealthConnectSleepRecord } from './convert';
import type { HealthProvider, PermissionResult, RawSleepSample } from './types';

function loadHC(): any | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect');
  } catch {
    return null;
  }
}

/** Health Connect provider. Returns raw records through `fetchSleepRecords`. */
export class HealthConnectProvider implements HealthProvider {
  readonly id = 'healthconnect' as const;
  private hc = loadHC();

  async isAvailable(): Promise<boolean> {
    if (!this.hc) return false;
    try {
      const status = await this.hc.getSdkStatus();
      return status === this.hc.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<PermissionResult> {
    if (!this.hc) return 'unavailable';
    try {
      await this.hc.initialize();
      const granted = await this.hc.requestPermission([{ accessType: 'read', recordType: 'SleepSession' }]);
      return Array.isArray(granted) && granted.length > 0 ? 'granted' : 'denied';
    } catch {
      return 'unavailable';
    }
  }

  async fetchSleepRecords(from: Date, to: Date): Promise<HealthConnectSleepRecord[]> {
    if (!this.hc) return [];
    try {
      const res = await this.hc.readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() },
      });
      return (res?.records ?? []) as HealthConnectSleepRecord[];
    } catch {
      return [];
    }
  }

  /** Interface method: Health Connect sessions are converted separately, so samples are empty. */
  async fetchSleep(): Promise<RawSleepSample[]> {
    return [];
  }
}
