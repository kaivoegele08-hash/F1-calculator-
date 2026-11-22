import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import type { SleepSession } from '@/engine/types';
import { addDaysToKey, dateKey, formatClock, formatDuration, localTimeToMs } from '@/engine/time';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { useNow } from '@/state/hooks';
import { TimeStepper } from './components/TimeStepper';
import { AppText, Button, Card, Notice, Screen } from './components/primitives';
import { spacing, useTheme } from './theme';

export const MAX_SLEEP_MIN = 16 * 60;

/** Compute session bounds from a wake date and two clock times. */
export function resolveBounds(
  wakeDate: string,
  bedHHmm: string,
  wakeHHmm: string,
  tz: string,
): { startAt: number; endAt: number; minutes: number; valid: boolean } {
  const endAt = localTimeToMs(wakeDate, wakeHHmm, tz);
  let startAt = localTimeToMs(wakeDate, bedHHmm, tz);
  if (startAt >= endAt) startAt = localTimeToMs(addDaysToKey(wakeDate, -1), bedHHmm, tz);
  const minutes = (endAt - startAt) / 60_000;
  return { startAt, endAt, minutes, valid: minutes >= 10 && minutes <= MAX_SLEEP_MIN };
}

export function NightEditor({ session }: { session?: SleepSession }) {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const saveNight = useApp((s) => s.saveNight);
  const deleteNight = useApp((s) => s.deleteNight);
  const tz = profile?.timezone ?? 'Europe/Berlin';
  const now = useNow(300_000);
  const today = dateKey(now, tz);

  const [wakeDate, setWakeDate] = useState(session ? dateKey(session.endAt, tz) : today);
  const [bed, setBed] = useState(session ? formatClock(session.startAt, tz) : '23:00');
  const [wake, setWake] = useState(session ? formatClock(session.endAt, tz) : '07:00');
  const [nap, setNap] = useState(session?.isNap ?? false);

  const b = resolveBounds(wakeDate, bed, wake, tz);

  const save = async () => {
    if (!b.valid) return;
    await saveNight({ id: session?.id, startAt: b.startAt, endAt: b.endAt, isNap: nap });
    router.back();
  };

  const remove = () => {
    const run = async () => {
      if (session) await deleteNight(session.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('night.deleteConfirm'))) run();
      return;
    }
    Alert.alert(t('night.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      {session && (
        <Card>
          <AppText variant="caption" muted>
            {t('night.source')}
          </AppText>
          <AppText variant="h3">
            {session.sourceDetail ?? session.source}
            {session.userEdited ? ` · ${t('night.edited')}` : ''}
          </AppText>
          {session.asleepMinutes != null && (
            <AppText variant="caption" muted>
              {t('night.asleep')}: {formatDuration(session.asleepMinutes)}
            </AppText>
          )}
        </Card>
      )}
      <Card>
        <AppText variant="h3">{t('night.wake')}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(4), marginVertical: spacing(2) }}>
          <Button label="‹" variant="secondary" onPress={() => setWakeDate(addDaysToKey(wakeDate, -1))} style={{ minWidth: 56 }} />
          <AppText variant="h3" style={{ minWidth: 110, textAlign: 'center' }}>
            {wakeDate}
          </AppText>
          <Button label="›" variant="secondary" disabled={wakeDate >= today} onPress={() => setWakeDate(addDaysToKey(wakeDate, 1))} style={{ minWidth: 56 }} />
        </View>
        <TimeStepper value={wake} onChange={setWake} />
      </Card>
      <Card>
        <AppText variant="h3">{t('night.bed')}</AppText>
        <TimeStepper value={bed} onChange={setBed} />
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="h3">{t('night.nap')}</AppText>
        <Switch accessibilityLabel={t('night.nap')} value={nap} onValueChange={setNap} trackColor={{ true: colors.accent, false: colors.surface2 }} />
      </Card>
      {b.valid ? (
        <AppText muted style={{ textAlign: 'center' }}>
          {formatDuration(b.minutes)}
        </AppText>
      ) : (
        <Notice tone="warn">{t('night.invalid')}</Notice>
      )}
      <Button label={t('common.save')} onPress={save} disabled={!b.valid} />
      {session && <Button label={t('common.delete')} variant="danger" onPress={remove} />}
    </Screen>
  );
}
