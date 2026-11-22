import { Stack } from 'expo-router';
import React from 'react';
import { Platform, Switch } from 'react-native';
import { t } from '@/i18n';
import { requestCalendarAccess } from '@/services/calendar';
import { useApp } from '@/state/app';
import { AppText, Card, Notice, Row, Screen } from '@/ui/components/primitives';
import { useTheme } from '@/ui/theme';

export default function CalendarSettings() {
  const { colors } = useTheme();
  const optIn = useApp((s) => s.settings.calendarOptIn);
  const setSetting = useApp((s) => s.setSetting);
  const toggle = async (v: boolean) => {
    if (v && Platform.OS !== 'web') {
      const ok = await requestCalendarAccess();
      if (!ok) return;
    }
    await setSetting('calendarOptIn', v);
  };
  return (
    <>
      <Stack.Screen options={{ title: t('settings.calendar') }} />
      <Screen>
        {Platform.OS === 'web' && <Notice>Kalenderzugriff gibt es nur in der App.</Notice>}
        <Card style={{ paddingVertical: 4 }}>
          <Row
            title="Termine im Tagesplan anzeigen"
            subtitle="Wir warnen, wenn ein Termin in dein Nachmittagstief fällt. Termine bleiben auf dem Gerät."
            right={<Switch accessibilityLabel="Kalender verwenden" value={optIn} onValueChange={toggle} trackColor={{ true: colors.accent, false: colors.surface2 }} />}
            last
          />
        </Card>
        <AppText variant="caption" muted>
          Über den Tagesplan kannst du deine Energiefenster in einen eigenen Kalender „Tagwerk“ eintragen.
        </AppText>
      </Screen>
    </>
  );
}
