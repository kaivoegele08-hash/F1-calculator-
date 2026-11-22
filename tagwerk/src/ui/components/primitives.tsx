import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, spacing, useTheme } from '../theme';

type Variant = 'title' | 'h2' | 'h3' | 'body' | 'caption' | 'number' | 'numberSmall';

const VARIANTS: Record<Variant, TextStyle> = {
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: fonts.semibold },
  h3: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
  number: { fontSize: 36, lineHeight: 42, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  numberSmall: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

export function AppText({ variant = 'body', muted, color, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[VARIANTS[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
    />
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.bad : variant === 'secondary' ? colors.surface2 : 'transparent';
  const fg = variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.onBad : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          paddingHorizontal: spacing(5),
          borderRadius: radius.button,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText variant="h3" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.button, padding: 3 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.button - 3,
              backgroundColor: active ? colors.surface : 'transparent',
            }}
          >
            <AppText variant="caption" color={active ? colors.text : colors.textMuted}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: spacing(4),
        justifyContent: 'center',
        borderRadius: radius.chip,
        backgroundColor: active ? colors.accent : colors.surface2,
      }}
    >
      <AppText variant="caption" color={active ? colors.onAccent : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Screen({
  children,
  onRefresh,
  refreshing,
  contentStyle,
  padBottom = true,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  padBottom?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        { padding: spacing(4), paddingTop: insets.top + spacing(3), gap: spacing(4), paddingBottom: padBottom ? spacing(10) : spacing(4) },
        contentStyle,
      ]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <AppText variant="h2" style={{ marginTop: spacing(2) }} accessibilityRole="header">
      {children}
    </AppText>
  );
}

export function Row({
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(3),
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        paddingVertical: spacing(2),
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="h3">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}
    >
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height: 6, backgroundColor: color ?? colors.accent }} />
    </View>
  );
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.small + 4,
        padding: spacing(3),
        backgroundColor: colors.surface2,
        borderLeftWidth: 3,
        borderLeftColor: tone === 'warn' ? colors.warn : colors.accent2,
      }}
    >
      <AppText variant="caption">{children}</AppText>
    </View>
  );
}
