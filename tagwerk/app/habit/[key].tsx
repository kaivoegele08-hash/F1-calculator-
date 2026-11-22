import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Switch, View } from 'react-native';
import { HABIT_BY_KEY } from '@/content/habits';
import type { HabitKey } from '@/data/types';
import { dateKey } from '@/engine/time';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { useNow } from '@/state/hooks';
import { Heatmap } from '@/ui/components/Heatmap';
import { AppText, Button, Card, Row, Screen } from '@/ui/components/primitives';
import { spacing, useTheme } from '@/ui/theme';

const OFFSETS = [-60, -30, -15, 0, 15, 30];

export default function HabitDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const habits = useApp((s) => s.habits);
  const logs = useApp((s) => s.habitLogs);
  const saveHabit = useApp((s) => s.saveHabit);
  const logHabit = useApp((s) => s.logHabit);
  const tz = useApp((s) => s.profile?.timezone ?? 'Europe/Berlin');
  const now = useNow(300_000);
  const meta = HABIT_BY_KEY[key as HabitKey];
  const habit = habits.find((h) => h.key === key);
  if (!meta || !habit) return <Screen><AppText muted>{t('empty.generic')}</AppText></Screen>;
  const today = dateKey(now, tz);
  const mine = logs.filter((l) => l.habitKey === meta.key);
  const status = mine.find((l) => l.date === today)?.status;

  return (
    <>
      <Stack.Screen options={{ title: meta.title }} />
      <Screen>
        <Card>
          <AppText variant="h3">{t('habits.why')}</AppText>
          <AppText style={{ marginTop: 6 }}>{meta.why}</AppText>
          {meta.librarySlug && <Button label="Mehr dazu im Wissen" variant="ghost" onPress={() => router.push(`/library/${meta.librarySlug}`)} />}
        </Card>
        <Card style={{ paddingVertical: 4 }}>
          <Row title={t('habits.enabled')} right={<Switch accessibilityLabel={t('habits.enabled')} value={habit.enabled} onValueChange={(v) => saveHabit({ ...habit, enabled: v })} trackColor={{ true: colors.accent, false: colors.surface2 }} />} />
          <Row title={t('habits.reminder')} subtitle={meta.notification.body} right={<Switch accessibilityLabel={t('habits.reminder')} value={habit.reminderEnabled} onValueChange={(v) => saveHabit({ ...habit, enabled: habit.enabled || v, reminderEnabled: v })} trackColor={{ true: colors.accent, false: colors.surface2 }} />} last />
        </Card>
        <Card>
          <AppText variant="h3">{t('habits.offset')}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(2) }}>
            {OFFSETS.map((o) => (
              <Button key={o} label={o === 0 ? 'Zum Start' : `${o > 0 ? '+' : ''}${o} min`} variant={habit.reminderOffsetMin === o ? 'primary' : 'secondary'} onPress={() => saveHabit({ ...habit, reminderOffsetMin: o })} />
            ))}
          </View>
        </Card>
        <Card>
          <AppText variant="h3">{t('habits.today')}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
            <Button style={{ flex: 1 }} label={t('habits.done')} variant={status === 'done' ? 'primary' : 'secondary'} onPress={() => logHabit(meta.key, today, status === 'done' ? null : 'done')} />
            <Button style={{ flex: 1 }} label={t('habits.skipped')} variant={status === 'skipped' ? 'primary' : 'secondary'} onPress={() => logHabit(meta.key, today, status === 'skipped' ? null : 'skipped')} />
          </View>
        </Card>
        <Card>
          <AppText variant="h3" style={{ marginBottom: spacing(2) }}>{t('habits.history')}</AppText>
          <Heatmap logs={mine} today={today} />
        </Card>
      </Screen>
    </>
  );
}
