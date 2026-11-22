import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { estimateSleepNeed } from '@/engine/sleepNeed';
import { formatDuration } from '@/engine/time';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { useNow } from '@/state/hooks';
import { AppText, Button, Card, Screen } from '@/ui/components/primitives';
import { spacing } from '@/ui/theme';

export default function SleepNeedSettings() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const saveProfile = useApp((s) => s.saveProfile);
  const now = useNow(300_000);
  const info = useMemo(() => (profile ? estimateSleepNeed(sessions, profile, now) : null), [profile, sessions, now]);
  const [minutes, setMinutes] = useState(profile?.sleepNeedMinutesManual ?? Math.round(info?.minutes ?? 480));
  if (!profile || !info) return <Screen><AppText>{t('common.loading')}</AppText></Screen>;
  const step = (d: number) => setMinutes((m) => Math.min(630, Math.max(360, m + d)));
  return (
    <>
      <Stack.Screen options={{ title: t('settings.sleepNeed') }} />
      <Screen>
        <Card>
          <AppText variant="caption" muted>
            Aktuell {info.basis === 'manual' ? '(manuell)' : info.basis === 'estimated' ? '(geschätzt)' : '(Richtwert)'}
          </AppText>
          <AppText variant="number">{formatDuration(info.minutes)}</AppText>
          {info.nights > 0 && <AppText variant="caption" muted>{t('sleep.needBasedOn', { n: info.nights })}</AppText>}
        </Card>
        <Card style={{ alignItems: 'center', gap: spacing(3) }}>
          <AppText variant="h3">{t('sleep.needSetManual')}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) }}>
            <Button label="−" variant="secondary" onPress={() => step(-15)} style={{ minWidth: 56 }} />
            <AppText variant="number" style={{ minWidth: 150, textAlign: 'center' }}>{formatDuration(minutes)}</AppText>
            <Button label="+" variant="secondary" onPress={() => step(15)} style={{ minWidth: 56 }} />
          </View>
          <AppText variant="caption" muted>Zwischen 6 h und 10 h 30 min</AppText>
        </Card>
        <Button label={t('common.save')} onPress={async () => { await saveProfile({ sleepNeedMinutesManual: minutes }); router.back(); }} />
        {profile.sleepNeedMinutesManual != null && (
          <Button label={t('sleep.needReset')} variant="secondary" onPress={async () => { await saveProfile({ sleepNeedMinutesManual: null }); router.back(); }} />
        )}
      </Screen>
    </>
  );
}
