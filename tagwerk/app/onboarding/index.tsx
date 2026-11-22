import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { demoProfile, generateDemoSessions } from '@/data/demo/generator';
import { HABITS } from '@/content/habits';
import type { HabitKey } from '@/data/types';
import { chronotypeFromAnswers, type ChronotypeAnswers } from '@/engine/chronotype';
import { computeDayPlan } from '@/engine/dayPlan';
import { dateKey, formatClock, formatDuration } from '@/engine/time';
import type { WorkSchedule } from '@/engine/types';
import { getHealthProvider } from '@/integrations/health';
import { requestNotificationPermission } from '@/services/notifications';
import { syncHealth } from '@/services/sync';
import { DEFAULT_WORK, dataStore, deviceTimezone, useApp } from '@/state/app';
import { t } from '@/i18n';
import { useDayPlan } from '@/state/hooks';
import { EnergyCurve } from '@/ui/components/EnergyCurve';
import { AppText, Button, Card, Chip, Notice, ProgressBar } from '@/ui/components/primitives';
import { CAFFEINE_OPTIONS, ChronotypeForm, DEFAULT_ANSWERS, TargetWakeForm, TextField, WorkForm } from '@/ui/forms';
import { spacing, useTheme } from '@/ui/theme';

const STEPS = ['welcome', 'principles', 'about', 'chrono', 'daily', 'caffeine', 'health', 'notifications', 'result', 'medical'] as const;
type Step = (typeof STEPS)[number];

const DEFAULT_REMINDERS: Partial<Record<HabitKey, boolean>> = {
  morning_light: true,
  caffeine_cutoff: true,
  wind_down: true,
  bedtime: true,
};

function WelcomeCurve() {
  const tz = deviceTimezone();
  const [nowMs] = useState(() => Date.now());
  const plan = useMemo(() => {
    const sessions = generateDemoSessions({ scenario: 'rested', lastWakeKey: dateKey(nowMs, tz), tz, nights: 20 }).filter((s) => s.endAt <= nowMs);
    const profile = { ...demoProfile('rested', tz, nowMs), timezone: tz };
    return computeDayPlan({ sessions, profile, now: nowMs });
  }, [tz, nowMs]);
  return <EnergyCurve plan={plan} now={nowMs} tz={tz} height={220} />;
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <AppText variant="title" accessibilityRole="header">
      {children}
    </AppText>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [stepIdx, setStepIdx] = useState(0);
  const step: Step = STEPS[stepIdx];

  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [answers, setAnswers] = useState<ChronotypeAnswers>(DEFAULT_ANSWERS);
  const [work, setWork] = useState<WorkSchedule>(DEFAULT_WORK);
  const [targetWake, setTargetWake] = useState<string | null>(null);
  const [caffeine, setCaffeine] = useState<'yes' | 'no'>('yes');
  const [cutoff, setCutoff] = useState(8);
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [morningCheck, setMorningCheck] = useState(false);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const applyOnboarding = useApp((s) => s.applyOnboarding);
  const finishOnboarding = useApp((s) => s.finishOnboarding);
  const loadDemo = useApp((s) => s.loadDemo);
  const reload = useApp((s) => s.reload);
  const updateEstimates = useApp((s) => s.updateEstimates);
  const { plan, now } = useDayPlan();
  const tz = deviceTimezone();

  const y = parseInt(year, 10);
  const yearOk = year === '' || (y >= 1900 && y <= new Date().getFullYear());
  const progress = (stepIdx + 1) / STEPS.length;

  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const connectHealth = async () => {
    setHealthBusy(true);
    setHealthMsg(null);
    try {
      if (Platform.OS === 'web') {
        await loadDemo('rested');
        setHealthMsg('Demo-Daten geladen.');
      } else {
        const provider = getHealthProvider(tz);
        const perm = await provider.requestPermissions();
        if (perm !== 'granted') {
          setHealthMsg(t('onboarding.healthDenied'));
        } else {
          const res = await syncHealth(dataStore, provider, tz);
          await reload();
          setHealthMsg(res.imported > 0 ? t('settings.syncDone', { n: res.imported }) : 'Keine Schlafdaten gefunden. Du kannst Nächte manuell eintragen oder Demo-Daten laden.');
        }
      }
    } finally {
      setHealthBusy(false);
    }
  };

  const demoInstead = async () => {
    setHealthBusy(true);
    await loadDemo('rested');
    setHealthMsg('Demo-Daten geladen.');
    setHealthBusy(false);
  };

  const goResult = async () => {
    if (Object.values(reminders).some(Boolean) && Platform.OS !== 'web') await requestNotificationPermission();
    setCalculating(true);
    setStepIdx(STEPS.indexOf('result'));
    await applyOnboarding({
      name: name.trim() || null,
      birthYear: year ? y : null,
      answers: { ...answers, workDaysPerWeek: Math.max(1, work.workDays.length) },
      workSchedule: work,
      targetWakeTime: targetWake,
      caffeineCutoffHours: caffeine === 'yes' ? cutoff : 8,
      habitReminders: reminders,
      morningCheck,
    });
    await updateEstimates(true);
    setTimeout(() => setCalculating(false), 1400);
  };

  const finish = async () => {
    await finishOnboarding();
    router.replace('/');
  };

  const chrono = chronotypeFromAnswers(answers);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing(2) }}>
      <View style={{ paddingHorizontal: spacing(4), gap: spacing(2) }}>
        <ProgressBar value={progress} />
        <AppText variant="caption" muted>
          {stepIdx + 1} / {STEPS.length}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(6) }} keyboardShouldPersistTaps="handled">
        {step === 'welcome' && (
          <>
            <Title>{t('onboarding.welcomeTitle')}</Title>
            <AppText muted>{t('onboarding.welcomeText')}</AppText>
            <Card><WelcomeCurve /></Card>
          </>
        )}

        {step === 'principles' && (
          <>
            <Title>{t('onboarding.principlesTitle')}</Title>
            <Card>
              <AppText variant="h2">{t('onboarding.debtCard')}</AppText>
              <AppText muted style={{ marginTop: 6 }}>{t('onboarding.debtCardText')}</AppText>
            </Card>
            <Card>
              <AppText variant="h2">{t('onboarding.clockCard')}</AppText>
              <AppText muted style={{ marginTop: 6 }}>{t('onboarding.clockCardText')}</AppText>
            </Card>
          </>
        )}

        {step === 'about' && (
          <>
            <Title>{t('onboarding.aboutTitle')}</Title>
            <Card style={{ gap: spacing(4) }}>
              <TextField label={t('onboarding.name')} value={name} onChangeText={setName} maxLength={30} />
              <TextField label={t('onboarding.birthYear')} value={year} onChangeText={(v) => setYear(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={4} />
              {!yearOk && <AppText variant="caption" color={colors.bad}>Bitte ein gültiges Jahr eingeben.</AppText>}
            </Card>
          </>
        )}

        {step === 'chrono' && (
          <>
            <Title>{t('onboarding.chronoTitle')}</Title>
            <ChronotypeForm value={answers} onChange={setAnswers} />
            <Notice>
              {t(`sleep.${chrono.chronotype}`)} · {t('sleep.socialJetlag')} {chrono.socialJetlagHours.toFixed(1)} h
            </Notice>
          </>
        )}

        {step === 'daily' && (
          <>
            <Title>{t('onboarding.dailyTitle')}</Title>
            <WorkForm value={work} onChange={setWork} />
            <TargetWakeForm value={targetWake} onChange={setTargetWake} />
          </>
        )}

        {step === 'caffeine' && (
          <>
            <Title>{t('onboarding.caffeineTitle')}</Title>
            <Card style={{ gap: spacing(3) }}>
              <AppText variant="h3">{t('onboarding.caffeineQuestion')}</AppText>
              <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                <Chip label={t('common.yes')} active={caffeine === 'yes'} onPress={() => setCaffeine('yes')} />
                <Chip label={t('onboarding.caffeineNone')} active={caffeine === 'no'} onPress={() => setCaffeine('no')} />
              </View>
              {caffeine === 'yes' && (
                <>
                  <AppText variant="caption" muted>{t('onboarding.caffeineCutoff')}</AppText>
                  <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                    {CAFFEINE_OPTIONS.map((h) => (
                      <Chip key={h} label={`${h} h`} active={cutoff === h} onPress={() => setCutoff(h)} />
                    ))}
                  </View>
                </>
              )}
            </Card>
          </>
        )}

        {step === 'health' && (
          <>
            <Title>{t('onboarding.healthTitle')}</Title>
            <AppText muted>{t('onboarding.healthText')}</AppText>
            {Platform.OS === 'web' && <Notice>{t('onboarding.healthWeb')}</Notice>}
            <Button label={healthBusy ? t('common.loading') : t('onboarding.healthButton')} onPress={connectHealth} disabled={healthBusy} />
            {healthMsg && <Notice>{healthMsg}</Notice>}
            {Platform.OS !== 'web' && healthMsg && <Button label="Demo-Daten laden" variant="secondary" onPress={demoInstead} />}
            <Button label={t('onboarding.healthSkip')} variant="ghost" onPress={next} />
          </>
        )}

        {step === 'notifications' && (
          <>
            <Title>{t('onboarding.notifTitle')}</Title>
            <AppText muted>{t('onboarding.notifText')}</AppText>
            <Card style={{ gap: spacing(1) }}>
              {HABITS.filter((h) => ['morning_light', 'caffeine_cutoff', 'wind_down', 'bedtime', 'dim_light', 'powernap'].includes(h.key)).map((h) => (
                <View key={h.key} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing(3) }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h3">{h.title}</AppText>
                  </View>
                  <Switch
                    accessibilityLabel={h.title}
                    value={!!reminders[h.key]}
                    onValueChange={(v) => setReminders({ ...reminders, [h.key]: v })}
                    trackColor={{ true: colors.accent, false: colors.surface2 }}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing(3) }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">Morgendliche Schnellabfrage</AppText>
                  <AppText variant="caption" muted>Wann bist du eingeschlafen?</AppText>
                </View>
                <Switch accessibilityLabel="Morgendliche Schnellabfrage" value={morningCheck} onValueChange={setMorningCheck} trackColor={{ true: colors.accent, false: colors.surface2 }} />
              </View>
            </Card>
          </>
        )}

        {step === 'result' && (
          <>
            <Title>{calculating ? t('onboarding.calculating') : t('onboarding.resultTitle')}</Title>
            {calculating || !plan ? (
              <Card style={{ alignItems: 'center', paddingVertical: spacing(10) }}>
                <AppText variant="h2">{t('onboarding.calculating')}</AppText>
              </Card>
            ) : (
              <>
                <Card style={{ gap: spacing(4) }}>
                  <View>
                    <AppText variant="caption" muted>{t('onboarding.resultNeed')}</AppText>
                    <AppText variant="number" color={colors.accent2}>{formatDuration(plan.needMinutes)}</AppText>
                  </View>
                  <View>
                    <AppText variant="caption" muted>{t('onboarding.resultDebt')}</AppText>
                    <AppText variant="number" color={colors.warn}>
                      {plan.debt.insufficientData ? t('today.debtNoData') : formatDuration(plan.debt.debtMinutes)}
                    </AppText>
                  </View>
                  <View>
                    <AppText variant="caption" muted>{t('onboarding.resultBed')}</AppText>
                    <AppText variant="number" color={colors.melatonin}>{formatClock(plan.bedtime.bedtime, tz)}</AppText>
                  </View>
                </Card>
                <Card style={{ paddingHorizontal: spacing(2) }}>
                  <EnergyCurve plan={plan} now={now} tz={tz} height={230} />
                </Card>
              </>
            )}
          </>
        )}

        {step === 'medical' && (
          <>
            <Title>{t('onboarding.medicalTitle')}</Title>
            <Notice tone="warn">{t('disclaimer')}</Notice>
            <Card>
              <AppText>{t('privacy')}</AppText>
            </Card>
          </>
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: spacing(3), padding: spacing(4), paddingBottom: insets.bottom + spacing(4) }}>
        {stepIdx > 0 && step !== 'result' && <Button label={t('common.back')} variant="secondary" onPress={back} style={{ flex: 1 }} />}
        {step === 'notifications' ? (
          <Button label={t('common.next')} onPress={goResult} style={{ flex: 2 }} />
        ) : step === 'result' ? (
          <Button label={t('common.next')} onPress={next} disabled={calculating} style={{ flex: 1 }} />
        ) : step === 'medical' ? (
          <Button label={t('onboarding.start')} onPress={finish} style={{ flex: 2 }} />
        ) : step === 'health' ? (
          <Button label={t('common.next')} onPress={next} style={{ flex: 2 }} />
        ) : (
          <Button label={t('common.next')} onPress={next} disabled={step === 'about' && !yearOk} style={{ flex: 2 }} />
        )}
      </View>
    </View>
  );
}
