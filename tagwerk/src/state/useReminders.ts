import { useEffect } from 'react';
import { Platform } from 'react-native';
import { HABIT_BY_KEY } from '@/content/habits';
import { dateKey } from '@/engine/time';
import { planReminders } from '@/services/notificationPlan';
import {
  attachResponseHandler,
  hasNotificationPermission,
  scheduleReminders,
  setupNotifications,
  snooze,
} from '@/services/notifications';
import type { HabitKey } from '@/data/types';
import { useApp } from './app';

/** Plan reminders for the next 7 days and (re)schedule them whenever relevant data changes. */
export function useReminderScheduling(active: boolean) {
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const habits = useApp((s) => s.habits);
  const morningCheck = useApp((s) => s.settings.morningCheck);
  const logHabit = useApp((s) => s.logHabit);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    setupNotifications();
    return attachResponseHandler((r) => {
      if (r.kind in HABIT_BY_KEY && r.date) {
        if (r.action === 'done') logHabit(r.kind as HabitKey, r.date, 'done');
        if (r.action === 'skip') logHabit(r.kind as HabitKey, r.date, 'skipped');
      }
      if (r.action === 'later') snooze(r);
    });
  }, [active, logHabit]);

  useEffect(() => {
    if (!active || !profile || Platform.OS === 'web') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!(await hasNotificationPermission()) || cancelled) return;
      const reminders = planReminders({ profile, sessions, habits, now: Date.now(), morningCheck });
      if (!cancelled) await scheduleReminders(reminders);
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, profile, sessions, habits, morningCheck]);
}

export const todayKey = (tz: string) => dateKey(Date.now(), tz);
