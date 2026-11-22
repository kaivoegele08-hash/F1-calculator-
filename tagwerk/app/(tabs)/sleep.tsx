import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { learnChronotype } from '@/engine/chronotype';
import { computeDebt } from '@/engine/sleepDebt';
import { buildSleepDays } from '@/engine/sleepDetection';
import { estimateSleepNeed } from '@/engine/sleepNeed';
import { resolveNeed } from '@/engine/dayPlan';
import { addDaysToKey, dateKey, formatClock, formatDuration } from '@/engine/time';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { useNow } from '@/state/hooks';
import { DebtLineChart, RegularityChart, SleepBarChart } from '@/ui/components/Charts';
import { AppText, Button, Card, Row, Screen, Segmented, SectionTitle } from '@/ui/components/primitives';
import { radius, spacing, useTheme } from '@/ui/theme';

type Range = 7 | 14 | 30 | 90;

export default function SleepScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const sessions = useApp((s) => s.sessions);
  const [range, setRange] = useState<Range>(14);
  const tz = profile?.timezone ?? 'Europe/Berlin';
  const shift = profile?.workSchedule.shiftMode ?? false;
  const now = useNow(300_000);

  const model = useMemo(() => {
    if (!profile) return null;
    const need = resolveNeed(profile, now);
    const days = buildSleepDays(sessions, tz, shift);
    const today = dateKey(now, tz);
    const dates = Array.from({ length: range }, (_, i) => addDaysToKey(today, -(range - 1 - i)));
    const nights = dates
      .map((d) => ({ date: d, minutes: days.get(d)?.mainMinutes ?? 0 }))
      .filter((n) => n.minutes > 0);
    const debt = dates
      .filter((d) => days.has(d))
      .map((d) => ({ date: d, minutes: computeDebt(sessions, need, tz, now, { refDate: d, shiftMode: shift }).debtMinutes }));
    const rows = dates.map((d) => days.get(d)).filter((d): d is NonNullable<typeof d> => !!d && d.main.length > 0);
    const needInfo = estimateSleepNeed(sessions, profile, now);
    const learned = learnChronotype(sessions, profile, now, profile.chronotypeUpdatedAt ?? undefined);
    const list = [...days.values()].filter((d) => d.main.length > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
    return { need, nights, debt, rows, needInfo, learned, list };
  }, [profile, sessions, range, tz, shift, now]);

  if (!profile || !model) return <Screen><AppText>{t('common.loading')}</AppText></Screen>;
  const { need, nights, debt, rows, needInfo, learned, list } = model;
  const score = learned?.score ?? profile.chronotypeScore;
  const markerLeft = `${Math.round(((score + 1) / 2) * 100)}%` as `${number}%`;

  const needText =
    needInfo.basis === 'manual' ? t('sleep.needManual') : needInfo.basis === 'estimated' ? t('sleep.needEstimated') : t('sleep.needDefault');

  return (
    <Screen>
      <AppText variant="title">{t('tabs.sleep')}</AppText>
      <Segmented<Range>
        value={range}
        onChange={setRange}
        options={[
          { value: 7, label: t('sleep.range7') },
          { value: 14, label: t('sleep.range14') },
          { value: 30, label: t('sleep.range30') },
          { value: 90, label: t('sleep.range90') },
        ]}
      />

      {nights.length === 0 ? (
        <Card>
          <AppText muted>{t('sleep.empty')}</AppText>
          <Button label={t('today.addNight')} style={{ marginTop: spacing(3) }} onPress={() => router.push('/night/new')} />
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="h3">{t('sleep.duration')}</AppText>
            <SleepBarChart nights={nights} need={need} />
          </Card>
          <Card>
            <AppText variant="h3">{t('sleep.debtTrend')}</AppText>
            <DebtLineChart points={debt} />
          </Card>
          <Card>
            <AppText variant="h3">{t('sleep.regularity')}</AppText>
            <RegularityChart days={rows} tz={tz} />
          </Card>
        </>
      )}

      <Card>
        <AppText variant="h3">{t('sleep.needTitle')}</AppText>
        <AppText variant="number">{formatDuration(need)}</AppText>
        <AppText variant="caption" muted>
          {needInfo.nights > 0 ? t('sleep.needBasedOn', { n: needInfo.nights }) + '. ' : ''}
          {needText}
        </AppText>
        <Button label={t('sleep.needSetManual')} variant="secondary" style={{ marginTop: spacing(3) }} onPress={() => router.push('/settings/sleep-need')} />
      </Card>

      <Card>
        <AppText variant="h3">{t('sleep.chronoTitle')}</AppText>
        <View style={{ marginTop: spacing(3), height: 12, borderRadius: 6, backgroundColor: colors.surface2, justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: markerLeft, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.bg }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <AppText variant="caption" muted>{t('sleep.early')}</AppText>
          <AppText variant="caption" muted>{t('sleep.intermediate')}</AppText>
          <AppText variant="caption" muted>{t('sleep.late')}</AppText>
        </View>
        <AppText variant="caption" muted style={{ marginTop: spacing(2) }}>
          {t('sleep.socialJetlag')}: {learned ? formatDuration(learned.socialJetlagHours * 60) : '–'}
        </AppText>
      </Card>

      <SectionTitle>{t('sleep.nights')}</SectionTitle>
      <Card style={{ paddingVertical: spacing(1) }}>
        {list.length === 0 ? (
          <AppText muted style={{ paddingVertical: spacing(3) }}>{t('sleep.empty')}</AppText>
        ) : (
          list.map((d, i) => (
            <Row
              key={d.date}
              title={`${d.date} · ${formatDuration(d.mainMinutes)}`}
              subtitle={`${formatClock(d.bedAt as number, tz)} – ${formatClock(d.wakeAt as number, tz)}${d.napMinutes ? ` · Nap ${formatDuration(d.napMinutes)}` : ''}`}
              onPress={() => router.push(`/night/${d.main[0].id}`)}
              last={i === list.length - 1}
            />
          ))
        )}
      </Card>
      <Button label={t('today.addNight')} variant="secondary" onPress={() => router.push('/night/new')} />
      <View style={{ height: radius.small }} />
    </Screen>
  );
}
