import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { formatClock, formatDuration } from '@/engine/time';
import { t } from '@/i18n';
import { debtText } from '@/lib/format';
import { useApp } from '@/state/app';
import { useDayPlan } from '@/state/hooks';
import { DebtGauge } from '@/ui/components/DebtGauge';
import { AppText, Card, Notice, Screen } from '@/ui/components/primitives';
import { spacing, useTheme } from '@/ui/theme';

export default function DebtDetail() {
  const { colors } = useTheme();
  const { plan } = useDayPlan();
  const tz = useApp((s) => s.profile?.timezone ?? 'Europe/Berlin');
  if (!plan) return <Screen><AppText>{t('common.loading')}</AppText></Screen>;
  const max = Math.max(plan.needMinutes * 1.2, ...plan.debt.nights.map((n) => n.sleptMinutes));
  return (
    <>
      <Stack.Screen options={{ title: t('today.debtTitle') }} />
      <Screen>
        <Card>
          <DebtGauge minutes={plan.debt.debtMinutes} level={plan.debt.level} insufficient={plan.debt.insufficientData} range={plan.debt.range} />
          <AppText style={{ textAlign: 'center' }}>{debtText(plan.debt.level)}</AppText>
          <AppText variant="caption" muted style={{ textAlign: 'center', marginTop: 6 }}>
            {t('debt.forecast', { time: formatClock(plan.bedtime.bedtime, tz), debt: formatDuration(plan.forecast.debtMinutes) })}
          </AppText>
        </Card>
        <Notice>{t('debt.detailExplain')}</Notice>
        <AppText variant="h2">{t('debt.detailTitle')}</AppText>
        <Card style={{ gap: spacing(3) }}>
          {plan.debt.nights.map((n) => (
            <View key={n.date} accessible accessibilityLabel={`${n.date}: ${formatDuration(n.sleptMinutes)}, Gewicht ${n.weight.toFixed(2)}, Beitrag ${formatDuration(n.contributionMinutes)}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="caption">{n.date}{n.estimated ? ` · ${t('debt.estimated')}` : ''}</AppText>
                <AppText variant="caption" muted>
                  {formatDuration(n.sleptMinutes)} · ×{n.weight.toFixed(2)}
                </AppText>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, marginTop: 4, overflow: 'hidden' }}>
                <View style={{ width: `${(n.sleptMinutes / max) * 100}%`, height: 8, backgroundColor: n.estimated ? colors.groggy : n.deltaMinutes > 0 ? colors.bad : colors.good, opacity: 0.4 + n.weight * 0.6 }} />
              </View>
            </View>
          ))}
        </Card>
      </Screen>
    </>
  );
}
