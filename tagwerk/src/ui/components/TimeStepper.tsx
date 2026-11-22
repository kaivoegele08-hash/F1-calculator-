import React from 'react';
import { Pressable, View } from 'react-native';
import { formatHHmm, parseHHmm } from '@/engine/time';
import { radius, spacing, useTheme } from '../theme';
import { AppText } from './primitives';

function Step({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: radius.button,
        backgroundColor: colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="h2">{label}</AppText>
    </Pressable>
  );
}

/** Large time picker without native modules: hour and minute steppers. Value is "HH:mm". */
export function TimeStepper({
  value,
  onChange,
  label,
  minuteStep = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  minuteStep?: number;
}) {
  const total = Math.round(parseHHmm(value) * 60);
  const set = (mins: number) => onChange(formatHHmm(((mins % 1440) + 1440) % 1440 / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return (
    <View style={{ gap: spacing(2) }}>
      {label ? <AppText variant="body">{label}</AppText> : null}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label ?? 'Uhrzeit'}
        accessibilityValue={{ text: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => set(total + (e.nativeEvent.actionName === 'increment' ? 15 : -15))}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(3) }}
      >
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Step label="+" a11y="Stunde später" onPress={() => set(total + 60)} />
          <Step label="−" a11y="Stunde früher" onPress={() => set(total - 60)} />
        </View>
        <AppText variant="number" style={{ minWidth: 130, textAlign: 'center' }}>
          {`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
        </AppText>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Step label="+" a11y={`${minuteStep} Minuten später`} onPress={() => set(total + minuteStep)} />
          <Step label="−" a11y={`${minuteStep} Minuten früher`} onPress={() => set(total - minuteStep)} />
        </View>
      </View>
    </View>
  );
}
