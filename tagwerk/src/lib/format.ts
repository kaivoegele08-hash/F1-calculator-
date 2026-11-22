import { formatClock, formatDuration } from '@/engine/time';
import { t } from '@/i18n';
import type { DayPhase, DayPlan } from '@/engine/dayPlan';
import type { DebtLevel } from '@/engine/types';

export { formatClock, formatDuration };

export function greeting(hour: number, name?: string | null): string {
  const base =
    hour < 5 ? t('today.goodNight') : hour < 11 ? t('today.goodMorning') : hour < 18 ? t('today.goodDay') : hour < 23 ? t('today.goodEvening') : t('today.goodNight');
  return name ? `${base}, ${name}` : base;
}

export function phaseEnd(plan: DayPlan, phase: DayPhase): number | null {
  switch (phase) {
    case 'grogginess':
      return plan.features.grogginessEnd;
    case 'morning_peak':
      return plan.features.morningPeak.end;
    case 'afternoon_dip':
      return plan.features.afternoonDip.end;
    case 'evening_peak':
      return plan.features.eveningPeak.end;
    default:
      return null;
  }
}

export function phaseSentence(plan: DayPlan, phase: DayPhase, tz: string): string {
  const end = phaseEnd(plan, phase);
  return t(`phaseText.${phase}`, { end: end ? formatClock(end, tz) : '' });
}

export function debtText(level: DebtLevel): string {
  return t(`debt.${level}`);
}

export const levelColorKey = (level: DebtLevel): 'good' | 'warn' | 'bad' =>
  level === 'low' ? 'good' : level === 'medium' ? 'warn' : 'bad';

export function relativeIn(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return 'jetzt';
  return `In ${formatDuration(min)}`;
}
