import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { dataStore, deviceTimezone } from '@/state/app';
import { getHealthProvider } from '@/integrations/health';
import { planReminders } from './notificationPlan';
import { hasNotificationPermission, scheduleReminders } from './notifications';
import { syncHealth } from './sync';

export const BACKGROUND_TASK = 'tagwerk-background-sync';

/** Best effort: sync sleep data and re-plan the reminders while the app is closed. */
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const profile = await dataStore.getProfile();
    if (!profile) return BackgroundTask.BackgroundTaskResult.Success;
    const tz = profile.timezone || deviceTimezone();
    await syncHealth(dataStore, getHealthProvider(tz), tz);
    if (await hasNotificationPermission()) {
      const [sessions, habits, morning] = await Promise.all([
        dataStore.listSessions(),
        dataStore.listHabits(),
        dataStore.getSetting('morning_check'),
      ]);
      await scheduleReminders(planReminders({ profile, sessions, habits, now: Date.now(), morningCheck: morning === '1' }));
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) return;
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: 12 * 60 });
  } catch {
    /* background work is optional */
  }
}

