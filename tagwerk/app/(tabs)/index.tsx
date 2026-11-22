import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { phaseAt } from '@/engine/dayPlan';
import { computeDebt } from '@/engine/sleepDebt';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { debtText, greeting, levelColorKey, phaseSentence, relativeIn } from '@/lib/format';
import { t } from '@/i18n';
import { cacheSummary } from '@/services/summaryCache';
import { dataStore, useApp } from '@/state/app';
import { useDayPlan, useTips } from '@/state/hooks';
import { DebtGauge } from '@/ui/components/DebtGauge';
import { EnergyCurve } from '@/ui/components/EnergyCurve';
import { AppText, Button, Card, Notice, Screen, SectionTitle } from '@/ui/components/primitives';
import { addDaysToKey, dateKey, formatClock, formatDuration, hourOfDay } from '@/engine/time';
import { spacing, useTheme } from '@/ui/theme';

export default function TodayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const syncing = useApp((s) => s.syncing);
  const syncNow = useApp((s) => s.syncNow);
  const settings = useApp((s) => s.settings);
  const setSetting = useApp((s) => s.setSetting);
  const { plan, now } = useDayPlan();
  const tips = useTips(plan);
  const tz = profile?.timezone ?? 'Europe/Berlin';

  // Cache today's result so widgets and exports can read it without recomputing.
  useEffect(() => {
    if (plan && profile) cacheSummary(dataStore, plan, sessions, profile, plan.now).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.date, plan?.debt.debtMinutes]);

  // Remember which tips were shown today so none repeats on more than two days in a row.
  useEffect(() => {
    if (!plan || tips.length === 0) return;
    const today = dateKey(now, tz);
    const ids = tips.map((x) => x.id);
    const cur = settings.tipHistory[today];
    if (!cur || cur.join() !== ids.join()) {
      const pruned = Object.fromEntries(Object.entries(settings.tipHistory).filter(([k]) => k >= dateKey(now - 10 * 86_400_000, tz)));
      setSetting('tipHistory', { ...pruned, [today]: ids }).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.date, tips.map((x) => x.id).join()]);

  if (!profile || !plan) return <Screen><AppText>{t('common.loading')}</AppText></Screen>;

  const phase = phaseAt(plan, now);
  const lastNight = [...sessions].filter((s) => !s.isNap && s.endAt <= now).sort((a, b) => b.endAt - a.endAt)[0];
  const yesterday = computeDebt(sessions, plan.needMinutes, tz, plan.now, {
    refDate: addDaysToKey(plan.date, -1),
    shiftMode: profile.workSchedule.shiftMode,
  });
  const trend = plan.debt.debtMinutes - yesterday.debtMinutes;
  const trendKey = Math.abs(trend) < 5 ? 'today.trendFlat' : trend > 0 ? 'today.trendUp' : 'today.trendDown';
  const TrendIcon = Math.abs(trend) < 5 ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const delta = plan.forecast.reductionMinutes;
  const forecastKey = delta >= 0 ? 'debt.forecast' : 'debt.forecastUp';

  return (
    <Screen onRefresh={() => syncNow()} refreshing={syncing}>
      <View>
        <AppText variant="title">{greeting(hourOfDay(now, tz), profile.name)}</AppText>
        <AppText muted>{phaseSentence(plan, phase, tz)}</AppText>
      </View>

      {!plan.hasWakeData && <Notice>{t('today.estimatedWake')}</Notice>}
      {plan.phase.adapting && <Notice tone="warn">{t('today.clockAdapting', { days: plan.phase.adaptDaysLeft })}</Notice>}

      <Card style={{ paddingHorizontal: spacing(2) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing(2) }}>
          <AppText variant="h3">{t('today.energyNow')}</AppText>
          <AppText variant="numberSmall" color={colors.accent}>
            {now >= plan.wakeAt && now <= plan.bedtime.bedtime ? Math.round(plan.currentEnergy) : '–'}
          </AppText>
        </View>
        <EnergyCurve plan={plan} now={now} tz={tz} height={260} />
      </Card>

      <Card onPress={() => router.push('/debt')} accessibilityLabel="Schlafschuld Details öffnen">
        <AppText variant="h3">{t('today.debtTitle')}</AppText>
        <DebtGauge
          minutes={plan.debt.debtMinutes}
          level={plan.debt.level}
          insufficient={plan.debt.insufficientData}
          range={plan.debt.range}
        />
        <AppText variant="body" color={colors[levelColorKey(plan.debt.level)]} style={{ textAlign: 'center' }}>
          {plan.debt.insufficientData ? t('empty.generic') : debtText(plan.debt.level)}
        </AppText>
        {!plan.debt.insufficientData && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <TrendIcon size={16} color={colors.textMuted} />
            <AppText variant="caption" muted>
              {Math.abs(trend) < 5 ? t(trendKey) : `${formatDuration(Math.abs(trend))} ${t(trendKey)}`}
            </AppText>
          </View>
        )}
        {!plan.debt.insufficientData && (
          <AppText variant="caption" muted style={{ textAlign: 'center', marginTop: 6 }}>
            {t(forecastKey, { time: formatClock(plan.bedtime.bedtime, tz), debt: formatDuration(plan.forecast.debtMinutes) })}
          </AppText>
        )}
        <AppText variant="caption" muted style={{ textAlign: 'center', marginTop: 4 }}>
          {t('debt.goal')}
        </AppText>
      </Card>

      {plan.nextEvent && (
        <Card>
          <AppText variant="caption" muted>
            {t('today.next')}
          </AppText>
          <AppText variant="h2">
            {relativeIn(plan.nextEvent.at - now)}: {t(`windows.${plan.nextEvent.kind}`)}
          </AppText>
        </Card>
      )}

      {plan.bedtime.hint === 'too_early' && <Notice tone="warn">{t('schedule.tooEarly')}</Notice>}

      <SectionTitle>{t('today.tips')}</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(3) }}>
        {tips.map((tip) => (
          <Card
            key={tip.id}
            style={{ width: 270, minHeight: 150 }}
            onPress={tip.librarySlug ? () => router.push(`/library/${tip.librarySlug}`) : tip.ctaHabitKey ? () => router.push(`/habit/${tip.ctaHabitKey}`) : undefined}
          >
            <AppText variant="h3">{tip.title}</AppText>
            <AppText variant="caption" muted style={{ marginTop: 6 }}>
              {tip.body}
            </AppText>
          </Card>
        ))}
      </ScrollView>

      <SectionTitle>{t('today.lastNight')}</SectionTitle>
      {lastNight ? (
        <Card>
          <AppText variant="numberSmall">
            {formatDuration((lastNight.asleepMinutes ?? (lastNight.endAt - lastNight.startAt) / 60_000))}
          </AppText>
          <AppText muted>
            {formatClock(lastNight.startAt, tz)} – {formatClock(lastNight.endAt, tz)} · {lastNight.sourceDetail ?? lastNight.source}
          </AppText>
          <Button
            label={t('common.edit')}
            variant="secondary"
            style={{ marginTop: spacing(3) }}
            onPress={() => router.push(`/night/${lastNight.id}`)}
          />
        </Card>
      ) : (
        <Card>
          <AppText muted>{t('today.noNights')}</AppText>
          <Button label={t('today.addNight')} style={{ marginTop: spacing(3) }} onPress={() => router.push('/night/new')} />
        </Card>
      )}
    </Screen>
  );
}
