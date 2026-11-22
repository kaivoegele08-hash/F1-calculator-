import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { HABITS } from '@/content/habits';
import { dateKey } from '@/engine/time';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { useNow } from '@/state/hooks';
import { AppText, Card, Screen } from '@/ui/components/primitives';
import { spacing, useTheme } from '@/ui/theme';

export default function HabitsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const habits = useApp((s) => s.habits);
  const logs = useApp((s) => s.habitLogs);
  const saveHabit = useApp((s) => s.saveHabit);
  const logHabit = useApp((s) => s.logHabit);
  const tz = useApp((s) => s.profile?.timezone ?? 'Europe/Berlin');
  const now = useNow(300_000);
  const today = dateKey(now, tz);

  return (
    <Screen>
      <AppText variant="title">{t('habits.title')}</AppText>
      {HABITS.map((meta) => {
        const h = habits.find((x) => x.key === meta.key);
        if (!h) return null;
        const status = logs.find((l) => l.habitKey === meta.key && l.date === today)?.status;
        return (
          <Card key={meta.key}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${meta.title} Details`} onPress={() => router.push(`/habit/${meta.key}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
              <View style={{ flex: 1 }}>
                <AppText variant="h3">{meta.title}</AppText>
                <AppText variant="caption" muted>{meta.short}</AppText>
              </View>
              <Switch
                accessibilityLabel={`${meta.title} ${t('habits.enabled')}`}
                value={h.enabled}
                onValueChange={(v) => saveHabit({ ...h, enabled: v, reminderEnabled: v ? h.reminderEnabled || meta.defaultReminder : false })}
                trackColor={{ true: colors.accent, false: colors.surface2 }}
              />
            </Pressable>
            {h.enabled && (
              <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(3) }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === 'done' }}
                  onPress={() => logHabit(meta.key, today, status === 'done' ? null : 'done')}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: status === 'done' ? colors.good : colors.surface2 }}
                >
                  <AppText variant="caption" color={status === 'done' ? colors.onAccent : colors.text}>{t('habits.done')}</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === 'skipped' }}
                  onPress={() => logHabit(meta.key, today, status === 'skipped' ? null : 'skipped')}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: status === 'skipped' ? colors.warn : colors.surface2 }}
                >
                  <AppText variant="caption" color={status === 'skipped' ? colors.onAccent : colors.text}>{t('habits.skipped')}</AppText>
                </Pressable>
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
