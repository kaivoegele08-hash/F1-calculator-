import React from 'react';
import { Switch, TextInput, View } from 'react-native';
import type { ChronotypeAnswers, PeakTime } from '@/engine/chronotype';
import type { WorkSchedule } from '@/engine/types';
import { t } from '@/i18n';
import { TimeStepper } from './components/TimeStepper';
import { AppText, Card, Chip, Notice } from './components/primitives';
import { fonts, radius, spacing, useTheme } from './theme';

export const DEFAULT_ANSWERS: ChronotypeAnswers = {
  freeSleepStart: '00:00',
  freeWake: '08:00',
  workBed: '23:00',
  workWake: '07:00',
  peak: 'midday',
  workDaysPerWeek: 5,
};

export function TextField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  label,
  maxLength,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  label: string;
  maxLength?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={{
          minHeight: 48,
          borderRadius: radius.button,
          paddingHorizontal: spacing(4),
          backgroundColor: colors.surface2,
          color: colors.text,
          fontFamily: fonts.medium,
          fontSize: 16,
        }}
      />
    </View>
  );
}

const PEAKS: { value: PeakTime; key: string }[] = [
  { value: 'morning', key: 'onboarding.peakMorning' },
  { value: 'midday', key: 'onboarding.peakMidday' },
  { value: 'evening', key: 'onboarding.peakEvening' },
  { value: 'night', key: 'onboarding.peakNight' },
];

export function ChronotypeForm({ value, onChange }: { value: ChronotypeAnswers; onChange: (v: ChronotypeAnswers) => void }) {
  const set = (patch: Partial<ChronotypeAnswers>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: spacing(4) }}>
      <Card>
        <TimeStepper label={t('onboarding.freeSleep')} value={value.freeSleepStart} onChange={(v) => set({ freeSleepStart: v })} />
      </Card>
      <Card>
        <TimeStepper label={t('onboarding.freeWake')} value={value.freeWake} onChange={(v) => set({ freeWake: v })} />
      </Card>
      <Card style={{ gap: spacing(3) }}>
        <AppText>{t('onboarding.peak')}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          {PEAKS.map((p) => (
            <Chip key={p.value} label={t(p.key)} active={value.peak === p.value} onPress={() => set({ peak: p.value })} />
          ))}
        </View>
      </Card>
      <Card>
        <TimeStepper label={t('onboarding.workSleep')} value={value.workBed} onChange={(v) => set({ workBed: v })} />
      </Card>
      <Card>
        <TimeStepper label={t('onboarding.workWake')} value={value.workWake} onChange={(v) => set({ workWake: v })} />
      </Card>
    </View>
  );
}

const DAYS = [
  { d: 1, label: 'Mo' },
  { d: 2, label: 'Di' },
  { d: 3, label: 'Mi' },
  { d: 4, label: 'Do' },
  { d: 5, label: 'Fr' },
  { d: 6, label: 'Sa' },
  { d: 0, label: 'So' },
];

export function WorkForm({ value, onChange }: { value: WorkSchedule; onChange: (v: WorkSchedule) => void }) {
  const { colors } = useTheme();
  const toggle = (d: number) =>
    onChange({ ...value, workDays: value.workDays.includes(d) ? value.workDays.filter((x) => x !== d) : [...value.workDays, d].sort() });
  return (
    <View style={{ gap: spacing(4) }}>
      <Card style={{ gap: spacing(3) }}>
        <AppText variant="h3">{t('onboarding.workDays')}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          {DAYS.map((x) => (
            <Chip key={x.d} label={x.label} active={value.workDays.includes(x.d)} onPress={() => toggle(x.d)} />
          ))}
        </View>
      </Card>
      <Card style={{ gap: spacing(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
          <View style={{ flex: 1 }}>
            <AppText variant="h3">{t('onboarding.shiftMode')}</AppText>
            <AppText variant="caption" muted>
              {t('onboarding.shiftHint')}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t('onboarding.shiftMode')}
            value={value.shiftMode}
            onValueChange={(v) => onChange({ ...value, shiftMode: v })}
            trackColor={{ true: colors.accent, false: colors.surface2 }}
          />
        </View>
      </Card>
      {value.shiftMode && <Notice>{t('onboarding.shiftHint')}</Notice>}
    </View>
  );
}

export function TargetWakeForm({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
        <AppText variant="h3" style={{ flex: 1 }}>
          {t('onboarding.targetWake')}
        </AppText>
        <Switch
          accessibilityLabel={t('onboarding.targetWake')}
          value={value != null}
          onValueChange={(v) => onChange(v ? '07:00' : null)}
          trackColor={{ true: colors.accent, false: colors.surface2 }}
        />
      </View>
      {value != null ? <TimeStepper value={value} onChange={onChange} /> : <AppText variant="caption" muted>{t('onboarding.targetWakeOff')}</AppText>}
    </Card>
  );
}

export const CAFFEINE_OPTIONS = [6, 8, 10];
