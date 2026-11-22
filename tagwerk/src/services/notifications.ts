import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannedReminder } from './notificationPlan';

const CATEGORY = 'habit';
const CHANNEL = 'reminders';

const supported = () => Platform.OS === 'ios' || Platform.OS === 'android';

export type ReminderAction = 'done' | 'skip' | 'later';

/** Configure handler, action category and Android channel. Safe to call repeatedly. */
export async function setupNotifications(): Promise<void> {
  if (!supported()) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    await Notifications.setNotificationCategoryAsync(CATEGORY, [
      { identifier: 'done', buttonTitle: 'Erledigt', options: { opensAppToForeground: false } },
      { identifier: 'skip', buttonTitle: 'Heute nicht', options: { opensAppToForeground: false } },
      { identifier: 'later', buttonTitle: 'Später', options: { opensAppToForeground: false } },
    ]);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Erinnerungen',
        // eslint-disable-next-line import/namespace
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    /* notifications are optional, never crash the app */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported()) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!supported()) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Replace all pending local notifications with the given plan. Returns how many were scheduled. */
export async function scheduleReminders(reminders: PlannedReminder[]): Promise<number> {
  if (!supported()) return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    let n = 0;
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: r.title,
          body: r.body,
          categoryIdentifier: r.kind === 'sleep_check' ? undefined : CATEGORY,
          data: { kind: r.kind, date: r.date },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(r.at),
          channelId: CHANNEL,
        },
      });
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}

export async function listScheduled(): Promise<{ id: string; title: string; at: number | null }[]> {
  if (!supported()) return [];
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list
      .map((n) => {
        const trig = n.trigger as { value?: number | string; date?: number | string } | null;
        const raw = trig?.value ?? trig?.date;
        return { id: n.identifier, title: n.content.title ?? '', at: raw != null ? new Date(raw as number).getTime() : null };
      })
      .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  } catch {
    return [];
  }
}

export interface ReminderResponse {
  action: ReminderAction | 'open';
  kind: string;
  date: string;
  title: string;
  body: string;
}

/** Listen for taps on notification actions. Returns an unsubscribe function. */
export function attachResponseHandler(cb: (r: ReminderResponse) => void): () => void {
  if (!supported()) return () => undefined;
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const content = resp.notification.request.content;
      const data = (content.data ?? {}) as { kind?: string; date?: string };
      const id = resp.actionIdentifier;
      cb({
        action: id === 'done' || id === 'skip' || id === 'later' ? id : 'open',
        kind: data.kind ?? '',
        date: data.date ?? '',
        title: content.title ?? '',
        body: content.body ?? '',
      });
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}

/** Snooze: show the same reminder again in `minutes`. */
export async function snooze(r: { title: string; body: string; kind: string; date: string }, minutes = 30) {
  if (!supported()) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, categoryIdentifier: CATEGORY, data: { kind: r.kind, date: r.date } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: CHANNEL },
    });
  } catch {
    /* ignore */
  }
}
