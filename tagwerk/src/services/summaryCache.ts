import type { DataStore, DailySummary } from '@/data/types';
import { buildSleepDays } from '@/engine/sleepDetection';
import { ENGINE_VERSION } from '@/engine/constants';
import type { DayPlan } from '@/engine/dayPlan';
import type { Profile, SleepSession } from '@/engine/types';

/** Build the cache row for one waking day. */
export function toSummary(plan: DayPlan, sessions: SleepSession[], profile: Profile, now: number): DailySummary {
  const day = buildSleepDays(sessions, profile.timezone, profile.workSchedule.shiftMode).get(plan.date);
  return {
    date: plan.date,
    totalSleepMinutes: day?.mainMinutes ?? 0,
    napMinutes: day?.napMinutes ?? 0,
    sleepDebtMinutes: plan.debt.debtMinutes,
    sleepNeedMinutes: plan.needMinutes,
    energyCurveJson: JSON.stringify(plan.curve.points.map((p) => [p.t, Math.round(p.energy * 10) / 10])),
    windowsJson: JSON.stringify(plan.windows),
    computedAt: now,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Write the summary only if there is none for that day or it was computed with another engine
 * version. Data changes clear the cache (see the store), so a hit is always current.
 */
export async function cacheSummary(
  store: DataStore,
  plan: DayPlan,
  sessions: SleepSession[],
  profile: Profile,
  now: number,
): Promise<'written' | 'fresh'> {
  const existing = await store.getSummary(plan.date);
  if (existing && existing.engineVersion === ENGINE_VERSION) return 'fresh';
  await store.saveSummary(toSummary(plan, sessions, profile, now));
  return 'written';
}
