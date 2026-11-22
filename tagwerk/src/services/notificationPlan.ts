import type { Habit } from '@/data/types';
import { HABIT_BY_KEY, type HabitMeta } from '@/content/habits';
import { computeDayPlan, computeTomorrowPlan, type DayPlan } from '@/engine/dayPlan';
import { MIN } from '@/engine/constants';
import type { Profile, SleepSession } from '@/engine/types';

export interface PlannedReminder {
  id: string;
  /** habit key or 'sleep_check' */
  kind: string;
  at: number;
  /** local date of the plan day (for habit logs) */
  date: string;
  title: string;
  body: string;
}

export const MAX_SCHEDULED = 60; // iOS keeps at most 64 pending local notifications
export const PLAN_DAYS = 7;

function anchorTime(meta: HabitMeta, plan: DayPlan): number | null {
  if (meta.anchor === 'wake') return plan.wakeAt;
  const w = plan.windows.find((x) => x.kind === meta.anchor);
  return w ? w.start : null;
}

export interface PlanOptions {
  profile: Profile;
  sessions: SleepSession[];
  habits: Habit[];
  now: number;
  days?: number;
  morningCheck?: boolean;
}

/**
 * Plan reminders for the next days. Each following day is computed assuming a full night at
 * the recommended bedtime. Nothing is scheduled between bedtime and waking up (quiet hours).
 */
export function planReminders(opts: PlanOptions): PlannedReminder[] {
  const days = Math.min(opts.days ?? PLAN_DAYS, PLAN_DAYS);
  const tz = opts.profile.timezone;
  const out: PlannedReminder[] = [];
  const enabled = opts.habits.filter((h) => h.enabled && h.reminderEnabled);
  let sessions = opts.sessions;
  let now = opts.now;
  let plan = computeDayPlan({ sessions, profile: opts.profile, now });

  for (let d = 0; d < days; d++) {
    const quietStart = plan.bedtime.bedtime;
    for (const h of enabled) {
      const meta = HABIT_BY_KEY[h.key];
      const anchor = anchorTime(meta, plan);
      if (anchor == null) continue;
      const at = anchor + h.reminderOffsetMin * MIN;
      if (at <= opts.now + MIN || at > quietStart + 5 * MIN) continue;
      out.push({
        id: `${h.key}-${plan.date}`,
        kind: h.key,
        at,
        date: plan.date,
        title: meta.notification.title,
        body: meta.notification.body,
      });
    }
    if (opts.morningCheck) {
      const at = plan.wakeAt + 30 * MIN;
      if (at > opts.now + MIN)
        out.push({
          id: `sleep_check-${plan.date}`,
          kind: 'sleep_check',
          at,
          date: plan.date,
          title: '🌅 Guten Morgen',
          body: 'Wann bist du eingeschlafen und aufgewacht? Tippe, um die Nacht zu bestätigen.',
        });
    }
    if (d === days - 1) break;
    const next = computeTomorrowPlan({ sessions, profile: opts.profile, now }, plan);
    // chain: tomorrow becomes today for the following iteration
    const simulated: SleepSession = {
      id: `sim-${d}`,
      startAt: plan.bedtime.bedtime + 15 * MIN,
      endAt: plan.bedtime.wakeAt,
      asleepMinutes: null,
      source: 'manual',
      confidence: 1,
      isNap: false,
      timezone: tz,
      userEdited: true,
    };
    sessions = [...sessions, simulated];
    now = plan.bedtime.wakeAt + 5 * MIN;
    plan = next;
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED);
}
