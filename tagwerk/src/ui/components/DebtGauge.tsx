import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { DEBT_GAUGE_MAX, DEBT_LOW_MAX, DEBT_MID_MAX } from '@/engine/constants';
import type { DebtLevel } from '@/engine/types';
import { t } from '@/i18n';
import { formatDuration, levelColorKey } from '@/lib/format';
import { useTheme } from '../theme';
import { AppText } from './primitives';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const W = 260;
const H = 142;
const CX = W / 2;
const CY = 130;
const R = 100;

/** minutes → angle in radians; 0 min = π (left), max = 0 (right) */
export const angleFor = (minutes: number) => Math.PI * (1 - Math.min(Math.max(minutes, 0), DEBT_GAUGE_MAX) / DEBT_GAUGE_MAX);

function arc(fromMin: number, toMin: number): string {
  const a0 = angleFor(fromMin);
  const a1 = angleFor(toMin);
  const p = (a: number) => `${CX + R * Math.cos(a)} ${CY - R * Math.sin(a)}`;
  return `M ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)}`;
}

export interface DebtGaugeProps {
  minutes: number;
  level: DebtLevel;
  insufficient?: boolean;
  range?: [number, number] | null;
}

export function DebtGauge({ minutes, level, insufficient, range }: DebtGaugeProps) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const angle = useSharedValue(Math.PI);
  useEffect(() => {
    const target = angleFor(insufficient && range ? (range[0] + range[1]) / 2 : minutes);
    angle.value = reduce ? target : withSpring(target, { damping: 9, stiffness: 80 });
  }, [minutes, insufficient, range, reduce, angle]);
  const needle = useAnimatedProps(() => ({
    x2: CX + (R - 14) * Math.cos(angle.value),
    y2: CY - (R - 14) * Math.sin(angle.value),
  }));
  const col = colors[levelColorKey(level)];
  const label = insufficient
    ? range
      ? `${t('today.debtNoData')}, ${t('debt.range', { lo: formatDuration(range[0]), hi: formatDuration(range[1]) })}`
      : t('today.debtNoData')
    : `${t('today.debtTitle')} ${formatDuration(minutes)}, ${t(`debt.${level}`)}`;
  return (
    <View
      style={{ alignItems: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Svg width={W} height={H}>
        <Path d={arc(0, DEBT_LOW_MAX)} stroke={colors.good} strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.9} />
        <Path d={arc(DEBT_LOW_MAX, DEBT_MID_MAX)} stroke={colors.warn} strokeWidth={14} fill="none" opacity={0.9} />
        <Path d={arc(DEBT_MID_MAX, DEBT_GAUGE_MAX)} stroke={colors.bad} strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.9} />
        <AnimatedLine x1={CX} y1={CY} stroke={colors.text} strokeWidth={4} strokeLinecap="round" animatedProps={needle} />
        <Circle cx={CX} cy={CY} r={8} fill={colors.text} />
      </Svg>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        {insufficient ? (
          <>
            <AppText variant="h3">{t('today.debtNoData')}</AppText>
            {range ? (
              <AppText variant="caption" muted>
                {t('debt.range', { lo: formatDuration(range[0]), hi: formatDuration(range[1]) })}
              </AppText>
            ) : null}
          </>
        ) : (
          <AppText variant="number" color={col}>
            {formatDuration(minutes)}
          </AppText>
        )}
      </View>
    </View>
  );
}
