import { Platform } from 'react-native';
import type { DemoScenarioId } from '@/data/demo/generator';
import { HealthConnectProvider } from './android';
import { HealthKitProvider } from './ios';
import { MockHealthProvider } from './mock';
import type { HealthProvider } from './types';

export * from './types';
export { samplesToSessions, healthConnectToSessions } from './convert';

/** Pick the provider for this platform. Web and unsupported devices use the demo provider. */
export function getHealthProvider(timezone: string, scenario: DemoScenarioId = 'rested'): HealthProvider {
  if (Platform.OS === 'ios') return new HealthKitProvider();
  if (Platform.OS === 'android') return new HealthConnectProvider();
  return new MockHealthProvider(timezone, scenario);
}
