import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { suggestWakeTime } from '@/engine/alarm';
import { MIN } from '@/engine/constants';
import { formatClock, formatDuration, localTimeToMs, dateKey, addDaysToKey, parseHHmm } from '@/engine/time';
import { requestNotificationPermission } from '@/services/notifications';
import { useApp } from '@/state/app';
import { useDayPlan } from '@/state/hooks';
import { AppText, Button, Card, Notice, Screen } from '@/ui/components/primitives';
import { TimeStepper } from '@/ui/components/TimeStepper';

export default function AlarmSettings() {
  const profile = useApp((s) => s.profile);
  const { plan, now } = useDayPlan();
  const tz = profile?.timezone ?? 'Europe/Berlin';
  const defaultEnd = profile?.targetWakeTime ?? '07:00';
  const [start, setStart] = useState(() => {
    const e = parseHHmm(defaultEnd) * 60 - 30;
    return `${String(Math.floor(((e + 1440) % 1440) / 60)).padStart(2, '0')}:${String((e + 1440) % 60).padStart(2, '0')}`;
  });
  const [end, setEnd] = useState(defaultEnd);
  const [message, setMessage] = useState<string | null>(null);

  const suggestion = useMemo(() => {
    if (!plan) return null;
    const onset = plan.bedtime.bedtime + 15 * MIN;
    const day = dateKey(onset, tz);
    const wakeDay = parseHHmm(end) * 60 < 12 * 60 ? addDaysToKey(day, 1) : day;
    const s = localTimeToMs(wakeDay, start, tz);
    let e = localTimeToMs(wakeDay, end, tz);
    if (e <= s) e = s + 30 * MIN;
    return { onset, ...suggestWakeTime(onset, s, e) };
  }, [plan, start, end, tz]);

  const schedule = async () => {
    if (!suggestion) return;
    if (Platform.OS === 'web') return setMessage('Im Browser kann kein Wecker geplant werden.');
    if (!(await requestNotificationPermission())) return setMessage('Benachrichtigungen sind nicht erlaubt.');
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: 'gentle-alarm',
        content: { title: '⏰ Guten Morgen', body: 'Du bist am Ende eines Schlafzyklus. Zeit zum Aufstehen.', sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Math.max(suggestion.wakeAt, now + 60_000)) },
      });
      setMessage(`Erinnerung für ${formatClock(suggestion.wakeAt, tz)} geplant.`);
    } catch {
      setMessage('Das Planen hat nicht geklappt.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sanfter Wecker' }} />
      <Screen>
        <Notice tone="warn">
          Hinweis: iOS erlaubt Apps von Drittanbietern keinen echten Wecker, der den Stummschalter oder „Nicht stören“ umgeht. Die Weck-Erinnerung ist eine Benachrichtigung. Trag die Zeit zur Sicherheit auch in die Uhr-App ein.
        </Notice>
        <Card><TimeStepper label="Frühester Zeitpunkt" value={start} onChange={setStart} /></Card>
        <Card><TimeStepper label="Spätester Zeitpunkt" value={end} onChange={setEnd} /></Card>
        {suggestion && (
          <Card>
            <AppText variant="caption" muted>Vorschlag (Ende eines 90-Minuten-Zyklus)</AppText>
            <AppText variant="number">{formatClock(suggestion.wakeAt, tz)}</AppText>
            <AppText variant="caption" muted>
              {suggestion.cycles} Zyklen, ca. {formatDuration((suggestion.wakeAt - suggestion.onset) / MIN)} Schlaf bei Einschlafen um {formatClock(suggestion.onset, tz)}
              {suggestion.aligned ? '' : '. In deinem Zeitfenster endet kein Zyklus, wir nehmen das späteste.'}
            </AppText>
          </Card>
        )}
        <Button label="Weck-Erinnerung planen" onPress={schedule} />
        {message && <Notice>{message}</Notice>}
      </Screen>
    </>
  );
}
