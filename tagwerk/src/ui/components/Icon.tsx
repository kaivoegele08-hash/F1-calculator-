import {
  AlarmClock,
  BatteryLow,
  BedDouble,
  Brain,
  Coffee,
  Dumbbell,
  Lightbulb,
  Moon,
  Sun,
  Utensils,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import type { IconName } from '@/content/windows';

const MAP: Record<IconName, LucideIcon> = {
  AlarmClock,
  BatteryLow,
  BedDouble,
  Brain,
  Coffee,
  Dumbbell,
  Lightbulb,
  Moon,
  Sun,
  Utensils,
  Wind,
  Zap,
};

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const C = MAP[name];
  return <C size={size} color={color} />;
}
