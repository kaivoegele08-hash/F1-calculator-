import React from 'react';
import { View } from 'react-native';
import { WINDOW_ICON, windowColor } from '@/content/windows';
import { formatClock, formatDuration } from '@/engine/time';
import type { DayWindow } from '@/engine/types';
import { t } from '@/i18n';
import { spacing, useTheme } from '../theme';
import { Icon } from './Icon';
import { AppText } from './primitives';

export interface TimelineRowProps {
  window: DayWindow;
  tz: string;
  isNow?: boolean;
  isPast?: boolean;
  extra?: string | null;
}

export function TimelineRow({ window: w, tz, isNow, isPast, extra }: TimelineRowProps) {
  const { colors } = useTheme();
  const color = windowColor(w.kind, colors);
  const minutes = (w.end - w.start) / 60_000;
  const title = t(`windows.${w.kind}`);
  const time = w.point ? formatClock(w.start, tz) : `${formatClock(w.start, tz)}–${formatClock(w.end, tz)}`;
  return (
    <View
      accessible
      accessibilityLabel={`${time}, ${title}. ${t(`windowText.${w.kind}`)}${extra ? ` ${extra}` : ''}`}
      style={{
        flexDirection: 'row',
        gap: spacing(3),
        padding: spacing(3),
        borderRadius: 16,
        backgroundColor: isNow ? colors.surface2 : 'transparent',
        borderWidth: isNow ? 1 : 0,
        borderColor: color,
        opacity: isPast ? 0.55 : 1,
      }}
    >
      <View style={{ width: 64 }}>
        <AppText variant="h3" style={{ fontVariant: ['tabular-nums'] }}>
          {formatClock(w.start, tz)}
        </AppText>
        {!w.point ? (
          <AppText variant="caption" muted>
            {formatDuration(minutes)}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: color + '33',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={WINDOW_ICON[w.kind]} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="caption" muted>
          {t(`windowText.${w.kind}`)}
        </AppText>
        {extra ? (
          <AppText variant="caption" color={colors.warn}>
            {extra}
          </AppText>
        ) : null}
        {!w.point ? (
          <View style={{ height: 4, borderRadius: 2, backgroundColor: color, width: `${Math.min(100, 20 + minutes / 1.5)}%`, opacity: 0.8, marginTop: 4 }} />
        ) : null}
      </View>
    </View>
  );
}
