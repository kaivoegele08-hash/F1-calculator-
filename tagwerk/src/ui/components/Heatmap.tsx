import React from 'react';
import { View } from 'react-native';
import { addDaysToKey } from '@/engine/time';
import type { HabitLog } from '@/data/types';
import { useTheme } from '../theme';

/** 4-week mini heatmap (28 days, oldest first). */
export function Heatmap({ logs, today }: { logs: HabitLog[]; today: string }) {
  const { colors } = useTheme();
  const byDate = new Map(logs.map((l) => [l.date, l.status]));
  const days = Array.from({ length: 28 }, (_, i) => addDaysToKey(today, -(27 - i)));
  const done = days.filter((d) => byDate.get(d) === 'done').length;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Letzte 4 Wochen: ${done} von 28 Tagen erledigt`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {days.map((d) => {
        const s = byDate.get(d);
        return (
          <View
            key={d}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: s === 'done' ? colors.good : s === 'skipped' ? colors.warn : colors.surface2,
              opacity: s ? 1 : 0.7,
              borderWidth: d === today ? 2 : 0,
              borderColor: colors.text,
            }}
          />
        );
      })}
    </View>
  );
}
