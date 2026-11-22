export type RawSleepValue = 'INBED' | 'ASLEEP' | 'AWAKE';

export interface RawSleepSample {
  /** ISO date strings */
  startDate: string;
  endDate: string;
  value: RawSleepValue;
  sourceName?: string;
}

export interface RawStepSample {
  startDate: string;
  endDate: string;
  steps: number;
}

export type PermissionResult = 'granted' | 'denied' | 'unavailable';

export interface HealthProvider {
  readonly id: 'healthkit' | 'healthconnect' | 'mock';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<PermissionResult>;
  fetchSleep(from: Date, to: Date): Promise<RawSleepSample[]>;
  fetchSteps?(from: Date, to: Date): Promise<RawStepSample[]>;
}
