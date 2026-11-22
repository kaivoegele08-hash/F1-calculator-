import type { WindowKind } from '@/engine/types';
import type { Colors } from '@/ui/theme';

export type IconName =
  | 'Brain'
  | 'Sun'
  | 'Zap'
  | 'Coffee'
  | 'BatteryLow'
  | 'Dumbbell'
  | 'Utensils'
  | 'Lightbulb'
  | 'Wind'
  | 'Moon'
  | 'BedDouble'
  | 'AlarmClock';

export const WINDOW_ICON: Record<WindowKind, IconName> = {
  grogginess: 'Brain',
  morning_light: 'Sun',
  morning_peak: 'Zap',
  caffeine_stop: 'Coffee',
  afternoon_dip: 'BatteryLow',
  nap: 'AlarmClock',
  evening_peak: 'Zap',
  sport: 'Dumbbell',
  last_meal: 'Utensils',
  dim_light: 'Lightbulb',
  wind_down: 'Wind',
  melatonin: 'Moon',
  bedtime: 'BedDouble',
};

export function windowColor(kind: WindowKind, c: Colors): string {
  switch (kind) {
    case 'grogginess':
      return c.groggy;
    case 'morning_peak':
    case 'evening_peak':
    case 'morning_light':
      return c.peak;
    case 'afternoon_dip':
    case 'nap':
      return c.dip;
    case 'melatonin':
    case 'wind_down':
    case 'dim_light':
    case 'bedtime':
      return c.melatonin;
    case 'sport':
      return c.good;
    default:
      return c.textMuted;
  }
}
