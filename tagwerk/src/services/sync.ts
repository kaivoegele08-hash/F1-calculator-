import type { DataStore } from '@/data/types';
import { DAY } from '@/engine/constants';
import type { SleepSession } from '@/engine/types';
import { healthConnectToSessions, samplesToSessions } from '@/integrations/health/convert';
import type { HealthConnectProvider } from '@/integrations/health/android';
import type { HealthProvider } from '@/integrations/health/types';

export const IMPORT_DAYS = 90;

export interface SyncResult {
  imported: number;
  status: 'ok' | 'denied' | 'unavailable' | 'error';
}

/** Fetch up to 90 days of sleep from a provider and merge it into the store. */
export async function syncHealth(
  store: DataStore,
  provider: HealthProvider,
  tz: string,
  now = Date.now(),
  days = IMPORT_DAYS,
): Promise<SyncResult> {
  try {
    if (!(await provider.isAvailable())) return { imported: 0, status: 'unavailable' };
    const from = new Date(now - days * DAY);
    const to = new Date(now);
    let sessions: SleepSession[];
    if (provider.id === 'healthconnect') {
      const records = await (provider as HealthConnectProvider).fetchSleepRecords(from, to);
      sessions = healthConnectToSessions(records, tz);
    } else {
      const raw = await provider.fetchSleep(from, to);
      sessions = samplesToSessions(raw, {
        source: 'healthkit',
        timezone: tz,
        now,
      }).map((s) => (provider.id === 'mock' ? { ...s, source: 'demo' as const } : s));
    }
    // Never overwrite nights the user has edited.
    const existing = await store.listSessions();
    const edited = new Set(existing.filter((s) => s.userEdited).map((s) => s.id));
    const fresh = sessions.filter((s) => !edited.has(s.id));
    await store.upsertSessions(fresh);
    return { imported: fresh.length, status: 'ok' };
  } catch {
    return { imported: 0, status: 'error' };
  }
}
