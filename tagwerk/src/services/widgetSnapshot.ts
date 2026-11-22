import type { DayPlan } from '@/engine/dayPlan';

export interface WidgetSnapshot {
  version: 1;
  updatedAt: number;
  debtMinutes: number;
  debtLevel: 'low' | 'medium' | 'high';
  insufficientData: boolean;
  energyNow: number;
  bedtime: number;
  next: { kind: string; at: number } | null;
  /** about 24 points from waking up to bedtime, values 0..100 */
  curve: number[];
}

/**
 * JSON snapshot for home-screen widgets. A native widget (WidgetKit via an App Group, or
 * react-native-android-widget) reads this file, see DECISIONS.md for the status.
 */
export function buildWidgetSnapshot(plan: DayPlan, now: number): WidgetSnapshot {
  const pts = plan.curve.points.filter((p) => p.t <= plan.bedtime.bedtime);
  const stride = Math.max(1, Math.floor(pts.length / 24));
  return {
    version: 1,
    updatedAt: now,
    debtMinutes: Math.round(plan.debt.debtMinutes),
    debtLevel: plan.debt.level,
    insufficientData: plan.debt.insufficientData,
    energyNow: Math.round(plan.currentEnergy),
    bedtime: plan.bedtime.bedtime,
    next: plan.nextEvent,
    curve: pts.filter((_, i) => i % stride === 0).map((p) => Math.round(p.energy)),
  };
}

