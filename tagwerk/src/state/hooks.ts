import { useEffect, useMemo, useState } from 'react';
import { computeDayPlan, computeTomorrowPlan, type DayPlan } from '@/engine/dayPlan';
import { selectTips, type Tip } from '@/engine/recommendations';
import { dateKey } from '@/engine/time';
import { useApp } from './app';

/** Current time in ms, refreshed every `intervalMs`. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useDayPlan(): { plan: DayPlan | null; now: number } {
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const now = useNow();
  const minute = Math.floor(now / 60_000);
  const plan = useMemo(
    () => (profile ? computeDayPlan({ sessions, profile, now: minute * 60_000 }) : null),
    [profile, sessions, minute],
  );
  return { plan, now };
}

export function useTomorrowPlan(): DayPlan | null {
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const { plan, now } = useDayPlan();
  return useMemo(
    () => (profile && plan ? computeTomorrowPlan({ sessions, profile, now }, plan) : null),
    [profile, sessions, plan, now],
  );
}

export function useTips(plan: DayPlan | null): Tip[] {
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const history = useApp((s) => s.settings.tipHistory);
  const logs = useApp((s) => s.habitLogs);
  return useMemo(() => {
    if (!profile || !plan) return [];
    const today = dateKey(plan.now, profile.timezone);
    const caffeineLateDays = logs.filter((l) => l.habitKey === 'caffeine_cutoff' && l.status === 'skipped').length;
    return selectTips({ plan, sessions, profile, today, history, caffeineLateDays });
  }, [profile, plan, sessions, history, logs]);
}
