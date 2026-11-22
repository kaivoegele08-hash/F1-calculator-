import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { buildSleepDays } from '@/engine/sleepDetection';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { AppText, Screen } from '@/ui/components/primitives';
import { NightEditor } from '@/ui/NightEditor';

/** The param is a session id, or a YYYY-MM-DD wake date (resolves to that night's main sleep). */
export default function NightScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const sessions = useApp((s) => s.sessions);
  const profile = useApp((s) => s.profile);
  let session = sessions.find((s) => s.id === date);
  if (!session && /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && profile) {
    session = buildSleepDays(sessions, profile.timezone, profile.workSchedule.shiftMode).get(date)?.main[0];
  }
  return (
    <>
      <Stack.Screen options={{ title: t('night.title') }} />
      {session ? (
        <NightEditor key={session.id} session={session} />
      ) : (
        <Screen>
          <AppText muted>{t('sleep.empty')}</AppText>
        </Screen>
      )}
    </>
  );
}
