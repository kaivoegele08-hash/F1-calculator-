import { line, curveMonotoneX } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line as SvgLine, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatDuration, hourOfDay } from '@/engine/time';
import type { SleepDay } from '@/engine/sleepDetection';
import { fonts, useTheme } from '../theme';

export interface NightPoint {
  date: string;
  minutes: number;
}

function useWidth() {
  const [w, setW] = useState(0);
  return { w, onLayout: (e: { nativeEvent: { layout: { width: number } } }) => setW(e.nativeEvent.layout.width) };
}

/** Sleep duration per night with the need as a horizontal line; deficit is coloured. */
export function SleepBarChart({ nights, need, height = 180 }: { nights: NightPoint[]; need: number; height?: number }) {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const max = Math.max(need * 1.25, ...nights.map((n) => n.minutes), 60);
  const top = 12;
  const bottom = 22;
  const y = scaleLinear().domain([0, max]).range([height - bottom, top]);
  const n = nights.length;
  const gap = n > 45 ? 1 : 3;
  const bw = n ? Math.max(2, (w - 8 - gap * (n - 1)) / n) : 0;
  const summary = `Schlafdauer der letzten ${n} Nächte, Bedarf ${formatDuration(need)}`;
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={summary}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {nights.map((p, i) => {
            const x = 4 + i * (bw + gap);
            const hSlept = height - bottom - y(Math.min(p.minutes, need));
            const hExtra = p.minutes > need ? y(need) - y(p.minutes) : 0;
            const hDeficit = p.minutes < need ? y(p.minutes) - y(need) : 0;
            return (
              <React.Fragment key={p.date}>
                <Rect x={x} y={y(Math.min(p.minutes, need))} width={bw} height={hSlept} rx={Math.min(3, bw / 2)} fill={colors.accent2} />
                {hExtra > 0 && <Rect x={x} y={y(p.minutes)} width={bw} height={hExtra} rx={Math.min(3, bw / 2)} fill={colors.good} opacity={0.8} />}
                {hDeficit > 0 && <Rect x={x} y={y(need)} width={bw} height={hDeficit} rx={Math.min(3, bw / 2)} fill={colors.bad} opacity={0.55} />}
              </React.Fragment>
            );
          })}
          <SvgLine x1={0} x2={w} y1={y(need)} y2={y(need)} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="5 4" />
          <SvgText x={w - 2} y={y(need) - 4} fontSize={11} fill={colors.accent} textAnchor="end" fontFamily={fonts.medium}>
            {formatDuration(need)}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

/** Line chart of the sleep debt over time (values in minutes). */
export function DebtLineChart({ points, height = 140 }: { points: NightPoint[]; height?: number }) {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  if (points.length < 2) return <View onLayout={onLayout} style={{ height: 8 }} />;
  const maxV = Math.max(600, ...points.map((p) => p.minutes));
  const x = scaleLinear().domain([0, points.length - 1]).range([6, Math.max(7, w - 6)]);
  const y = scaleLinear().domain([0, maxV]).range([height - 14, 10]);
  const d = line<NightPoint>()
    .x((_, i) => x(i))
    .y((p) => y(p.minutes))
    .curve(curveMonotoneX)(points);
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={`Schlafschuld im Verlauf, aktuell ${formatDuration(points[points.length - 1].minutes)}`}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <SvgLine x1={0} x2={w} y1={y(300)} y2={y(300)} stroke={colors.good} strokeDasharray="4 4" strokeWidth={1} opacity={0.7} />
          <SvgLine x1={0} x2={w} y1={y(600)} y2={y(600)} stroke={colors.bad} strokeDasharray="4 4" strokeWidth={1} opacity={0.7} />
          <Path d={d ?? ''} stroke={colors.melatonin} strokeWidth={3} fill="none" strokeLinecap="round" />
          <SvgText x={4} y={y(300) - 3} fontSize={10} fill={colors.good} fontFamily={fonts.medium}>5 h</SvgText>
          <SvgText x={4} y={y(600) - 3} fontSize={10} fill={colors.bad} fontFamily={fonts.medium}>10 h</SvgText>
        </Svg>
      )}
    </View>
  );
}

/** Bands from falling asleep to waking up per night; the axis runs 18:00 → 14:00. */
export function RegularityChart({ days, tz, height = 170 }: { days: SleepDay[]; tz: string; height?: number }) {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const rows = days.filter((d) => d.bedAt != null && d.wakeAt != null);
  const norm = (h: number) => (h < 14 ? h + 24 : h); // 18..38
  const x = scaleLinear().domain([18, 38]).range([26, Math.max(27, w - 6)]);
  const n = rows.length;
  const band = n ? Math.max(2, Math.min(10, (height - 24) / n - 1)) : 0;
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel="Einschlaf- und Aufwachzeiten pro Nacht">
      {w > 0 && (
        <Svg width={w} height={height}>
          {[20, 24, 28, 32, 36].map((h) => (
            <React.Fragment key={h}>
              <SvgLine x1={x(h)} x2={x(h)} y1={4} y2={height - 16} stroke={colors.border} strokeWidth={0.5} />
              <SvgText x={x(h)} y={height - 3} fontSize={10} fill={colors.textMuted} textAnchor="middle" fontFamily={fonts.medium}>
                {String(h % 24).padStart(2, '0')}
              </SvgText>
            </React.Fragment>
          ))}
          {rows.map((d, i) => {
            const a = norm(hourOfDay(d.bedAt as number, tz));
            let b = norm(hourOfDay(d.wakeAt as number, tz));
            if (b < a) b += 24;
            const x0 = x(Math.min(a, 38));
            const x1 = x(Math.min(b, 38));
            return <Rect key={d.date} x={x0} y={4 + i * (band + 1)} width={Math.max(2, x1 - x0)} height={band} rx={band / 2} fill={colors.accent2} opacity={0.85} />;
          })}
        </Svg>
      )}
    </View>
  );
}
