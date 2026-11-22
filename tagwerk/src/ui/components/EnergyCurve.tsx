import { area, curveMonotoneX, line } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { windowColor } from '@/content/windows';
import { energyAt } from '@/engine/energyCurve';
import { phaseAt, type DayPlan } from '@/engine/dayPlan';
import { HOUR } from '@/engine/constants';
import { hourOfDay, formatClock } from '@/engine/time';
import { t } from '@/i18n';
import { phaseSentence } from '@/lib/format';
import { fonts, useTheme } from '../theme';
import { AppText } from './primitives';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BAND_KINDS = ['grogginess', 'morning_peak', 'afternoon_dip', 'evening_peak', 'melatonin'] as const;
const PAD = { left: 10, right: 10, top: 14, bottom: 36 };

export interface EnergyCurveProps {
  plan: DayPlan;
  now: number;
  tz: string;
  height?: number;
}

export function curveAccessibilityLabel(plan: DayPlan, now: number, tz: string): string {
  const phase = phaseAt(plan, now);
  return `Energie aktuell ${Math.round(plan.currentEnergy)} von 100. ${phaseSentence(plan, phase, tz)}`;
}

export function EnergyCurve({ plan, now, tz, height = 260 }: EnergyCurveProps) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<{ t: number } | null>(null);
  const lastPhase = useRef<string>('');
  const start = plan.wakeAt;
  const end = plan.bedtime.bedtime;
  const innerW = Math.max(1, width - PAD.left - PAD.right);

  const geometry = useMemo(() => {
    if (width === 0) return null;
    const x = scaleLinear().domain([start, end]).range([PAD.left, PAD.left + innerW]);
    const y = scaleLinear().domain([0, 100]).range([height - PAD.bottom, PAD.top]);
    const pts = plan.curve.points.filter((p) => p.t >= start && p.t <= end);
    const lineGen = line<{ t: number; energy: number }>()
      .x((p) => x(p.t))
      .y((p) => y(p.energy))
      .curve(curveMonotoneX);
    const areaGen = area<{ t: number; energy: number }>()
      .x((p) => x(p.t))
      .y0(height - PAD.bottom)
      .y1((p) => y(p.energy))
      .curve(curveMonotoneX);
    return { x, y, linePath: lineGen(pts) ?? '', areaPath: areaGen(pts) ?? '' };
  }, [width, start, end, plan.curve.points, innerW, height]);

  const progress = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    progress.value = reduce ? 1 : withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [reduce, progress]);
  const revealProps = useAnimatedProps(() => ({ width: progress.value * (innerW + PAD.left + PAD.right) }));

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, pulse]);
  const pulseProps = useAnimatedProps(() => ({ r: 6 + pulse.value * 8, opacity: 0.5 * (1 - pulse.value) }));

  const timeFromX = (px: number) => {
    const f = Math.min(1, Math.max(0, (px - PAD.left) / innerW));
    return start + f * (end - start);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const tt = timeFromX(e.nativeEvent.locationX);
          setScrub({ t: tt });
        },
        onPanResponderMove: (e) => {
          const tt = timeFromX(e.nativeEvent.locationX);
          setScrub({ t: tt });
          const ph = phaseAt(plan, tt);
          if (ph !== lastPhase.current) {
            lastPhase.current = ph;
            if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
          }
        },
        onPanResponderRelease: () => setScrub(null),
        onPanResponderTerminate: () => setScrub(null),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, start, end, innerW],
  );

  const ticks = useMemo(() => {
    const out: number[] = [];
    let tt = Math.ceil(start / HOUR) * HOUR;
    for (; tt <= end; tt += HOUR) if (Math.round(hourOfDay(tt, tz)) % 3 === 0) out.push(tt);
    return out;
  }, [start, end, tz]);

  const nowIn = now >= start && now <= end;
  const label = curveAccessibilityLabel(plan, now, tz);

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      {...responder.panHandlers}
    >
      {geometry && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0.02} />
            </LinearGradient>
            <ClipPath id="reveal">
              <AnimatedRect x={0} y={0} height={height} animatedProps={revealProps} />
            </ClipPath>
            <ClipPath id="past">
              <Rect x={0} y={0} width={Math.max(0, nowIn ? geometry.x(now) : now > end ? width : 0)} height={height} />
            </ClipPath>
            <ClipPath id="future">
              <Rect
                x={nowIn ? geometry.x(now) : now > end ? width : 0}
                y={0}
                width={Math.max(0, width - (nowIn ? geometry.x(now) : now > end ? width : 0))}
                height={height}
              />
            </ClipPath>
          </Defs>

          <G clipPath="url(#reveal)">
            {[0, 25, 50, 75, 100].map((v) => (
              <Line key={v} x1={PAD.left} x2={width - PAD.right} y1={geometry.y(v)} y2={geometry.y(v)} stroke={colors.border} strokeWidth={0.5} strokeDasharray="3 5" />
            ))}
            <G clipPath="url(#past)" opacity={0.4}>
              <Path d={geometry.areaPath} fill="url(#fill)" />
              <Path d={geometry.linePath} stroke={colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
            </G>
            <G clipPath="url(#future)">
              <Path d={geometry.areaPath} fill="url(#fill)" />
              <Path d={geometry.linePath} stroke={colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
            </G>
            {BAND_KINDS.map((k) => {
              const w = plan.windows.find((x) => x.kind === k);
              if (!w) return null;
              const x0 = geometry.x(Math.max(w.start, start));
              const x1 = geometry.x(Math.min(w.end, end));
              if (x1 <= x0) return null;
              return <Rect key={k} x={x0} y={height - PAD.bottom + 6} width={x1 - x0} height={8} rx={4} fill={windowColor(k, colors)} opacity={0.9} />;
            })}
            {ticks.map((tt) => (
              <SvgText key={tt} x={geometry.x(tt)} y={height - 6} fontSize={11} fill={colors.textMuted} textAnchor="middle" fontFamily={fonts.medium}>
                {formatClock(tt, tz).slice(0, 2)}
              </SvgText>
            ))}
          </G>

          {nowIn && (
            <G>
              <Line x1={geometry.x(now)} x2={geometry.x(now)} y1={PAD.top} y2={height - PAD.bottom} stroke={colors.text} strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
              <AnimatedCircle cx={geometry.x(now)} cy={geometry.y(energyAt(plan.curve.points, now))} fill={colors.accent} animatedProps={pulseProps} />
              <Circle cx={geometry.x(now)} cy={geometry.y(energyAt(plan.curve.points, now))} r={6} fill={colors.accent} stroke={colors.bg} strokeWidth={2} />
            </G>
          )}

          {scrub && (
            <G>
              <Line x1={geometry.x(scrub.t)} x2={geometry.x(scrub.t)} y1={PAD.top} y2={height - PAD.bottom} stroke={colors.accent2} strokeWidth={1.5} />
              <Circle cx={geometry.x(scrub.t)} cy={geometry.y(energyAt(plan.curve.points, scrub.t))} r={5} fill={colors.accent2} />
            </G>
          )}
        </Svg>
      )}
      {scrub && geometry && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: Math.min(Math.max(geometry.x(scrub.t) - 70, 0), Math.max(0, width - 140)),
            width: 140,
            backgroundColor: colors.surface2,
            borderRadius: 12,
            padding: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <AppText variant="h3">{formatClock(scrub.t, tz)}</AppText>
          <AppText variant="caption" muted>
            {t(`phases.${phaseAt(plan, scrub.t)}`)} · {Math.round(energyAt(plan.curve.points, scrub.t))}/100
          </AppText>
        </View>
      )}
    </View>
  );
}
