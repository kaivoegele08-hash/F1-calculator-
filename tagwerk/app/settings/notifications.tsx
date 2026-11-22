import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Switch } from 'react-native';
import { HABITS } from '@/content/habits';
import { formatClock } from '@/engine/time';
import { t } from '@/i18n';
import { planReminders } from '@/services/notificationPlan';
import { listScheduled, requestNotificationPermission, scheduleReminders } from '@/services/notifications';
import { useApp } from '@/state/app';
import { useNow } from '@/state/hooks';
import { AppText, Button, Card, Notice, Row, Screen, SectionTitle } from '@/ui/components/primitives';
import { useTheme } from '@/ui/theme';

export default function NotificationSettings() {
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const habits = useApp((s) => s.habits);
  const saveHabit = useApp((s) => s.saveHabit);
  const morningCheck = useApp((s) => s.settings.morningCheck);
  const setSetting = useApp((s) => s.setSetting);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [nativeList, setNativeList] = useState<{ id: string; title: string; at: number | null }[]>([]);
  const tz = profile?.timezone ?? 'Europe/Berlin';
  const now = useNow(300_000);

  const planned = useMemo(
    () => (profile ? planReminders({ profile, sessions, habits, now, morningCheck }) : []),
    [profile, sessions, habits, morningCheck, now],
  );

  useEffect(() => {
    listScheduled().then(setNativeList);
  }, [scheduled]);

  const enable = async () => {
    const ok = await requestNotificationPermission();
    setGranted(ok);
    if (ok) setScheduled(await scheduleReminders(planned));
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.notifications') }} />
      <Screen>
        {Platform.OS === 'web' && <Notice>Im Browser werden keine Erinnerungen versendet. Die geplanten Zeiten siehst du unten.</Notice>}
        {granted === false && <Notice tone="warn">Benachrichtigungen sind nicht erlaubt. Du kannst das in den System-Einstellungen ändern.</Notice>}
        <Button label="Benachrichtigungen erlauben und planen" onPress={enable} />
        {scheduled != null && <AppText muted>{scheduled} Erinnerungen geplant.</AppText>}
        <Card style={{ paddingVertical: 4 }}>
          {HABITS.map((meta, i) => {
            const h = habits.find((x) => x.key === meta.key);
            if (!h) return null;
            return (
              <Row
                key={meta.key}
                title={meta.title}
                right={
                  <Switch
                    accessibilityLabel={`${meta.title} Erinnerung`}
                    value={h.enabled && h.reminderEnabled}
                    onValueChange={(v) => saveHabit({ ...h, enabled: h.enabled || v, reminderEnabled: v })}
                    trackColor={{ true: colors.accent, false: colors.surface2 }}
                  />
                }
                last={i === HABITS.length - 1}
              />
            );
          })}
        </Card>
        <Card style={{ paddingVertical: 4 }}>
          <Row
            title="Morgendliche Schnellabfrage"
            subtitle="Eine halbe Stunde nach dem Aufwachen: Wann bist du eingeschlafen?"
            right={<Switch accessibilityLabel="Morgendliche Schnellabfrage" value={morningCheck} onValueChange={(v) => setSetting('morningCheck', v)} trackColor={{ true: colors.accent, false: colors.surface2 }} />}
            last
          />
        </Card>
        <SectionTitle>{t('settings.debugReminders')}</SectionTitle>
        <Card style={{ gap: 6 }}>
          {planned.length === 0 ? (
            <AppText muted>{t('settings.noReminders')}</AppText>
          ) : (
            planned.map((r) => (
              <AppText key={r.id} variant="caption">
                {r.date} {formatClock(r.at, tz)} · {r.title}
              </AppText>
            ))
          )}
        </Card>
        {nativeList.length > 0 && (
          <>
            <AppText variant="caption" muted>Im System eingetragen: {nativeList.length}</AppText>
          </>
        )}
      </Screen>
    </>
  );
}
