import type { Profile, SleepSession, WorkSchedule } from '@/engine/types';
import { addDaysToKey, dateKey, dayOfWeekOfKey, localTimeToMs, formatHHmm } from '@/engine/time';

/** Small deterministic PRNG so demo data is stable between runs. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DemoScenarioId = 'rested' | 'exam_week' | 'late_early_shift' | 'weekend_catchup' | 'shift_worker';

export interface DemoScenario {
  id: DemoScenarioId;
  label: string;
  description: string;
  profile: Partial<Profile>;
}

const WORK: WorkSchedule = { workDays: [1, 2, 3, 4, 5], workStart: '09:00', workEnd: '17:00', shiftMode: false };

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'rested',
    label: 'Gut ausgeschlafen',
    description: 'Regelmäßiger Schlaf von etwa 8 Stunden.',
    profile: { chronotype: 'intermediate', circadianPhaseOffsetMin: 0, workSchedule: WORK },
  },
  {
    id: 'exam_week',
    label: 'Prüfungswoche',
    description: 'Mehrere kurze Nächte in Folge.',
    profile: { chronotype: 'intermediate', circadianPhaseOffsetMin: 30, workSchedule: WORK },
  },
  {
    id: 'late_early_shift',
    label: 'Spättyp mit Frühschicht',
    description: 'Später Rhythmus, aber früh aufstehen unter der Woche.',
    profile: { chronotype: 'late', chronotypeScore: 0.8, circadianPhaseOffsetMin: 150, workSchedule: WORK },
  },
  {
    id: 'weekend_catchup',
    label: 'Wochenend-Nachholer',
    description: 'Unter der Woche zu wenig, am Wochenende viel Schlaf.',
    profile: { chronotype: 'intermediate', circadianPhaseOffsetMin: 60, workSchedule: WORK },
  },
  {
    id: 'shift_worker',
    label: 'Schichtarbeiter',
    description: 'Wechselnde Schlafzeiten mit Nachtschicht-Phase.',
    profile: {
      chronotype: 'intermediate',
      circadianPhaseOffsetMin: 0,
      workSchedule: { ...WORK, shiftMode: true },
    },
  },
];

interface Plan {
  bed: number; // clock hours, may be > 24 (next day)
  durationMin: number;
}

function planFor(id: DemoScenarioId, dayIndex: number, wakeKey: string, rnd: () => number): Plan {
  const dow = dayOfWeekOfKey(wakeKey);
  const weekend = dow === 0 || dow === 6;
  const j = (rng: number) => (rnd() - 0.5) * 2 * rng;
  switch (id) {
    case 'rested':
      return { bed: 22.75 + j(0.4), durationMin: 480 + j(25) };
    case 'exam_week':
      return dayIndex < 7
        ? { bed: 25 + j(0.5), durationMin: 330 + j(40) }
        : { bed: 23 + j(0.5), durationMin: 450 + j(30) };
    case 'late_early_shift':
      return weekend
        ? { bed: 26 + j(0.6), durationMin: 540 + j(30) }
        : { bed: 24.75 + j(0.5), durationMin: 395 + j(30) };
    case 'weekend_catchup':
      return weekend
        ? { bed: 24.5 + j(0.6), durationMin: 570 + j(30) }
        : { bed: 23.5 + j(0.4), durationMin: 400 + j(30) };
    case 'shift_worker': {
      const block = Math.floor(dayIndex / 5) % 3;
      if (block === 0) return { bed: 23 + j(0.5), durationMin: 450 + j(30) };
      if (block === 1) return { bed: 31.5 + j(0.5), durationMin: 420 + j(30) }; // 07:30 → day sleep
      return { bed: 21.5 + j(0.5), durationMin: 400 + j(30) };
    }
  }
}

export interface DemoOptions {
  scenario: DemoScenarioId;
  /** last wake date (YYYY-MM-DD) */
  lastWakeKey: string;
  nights?: number;
  tz: string;
  seed?: number;
}

/** Generate realistic demo nights (and occasional naps), newest last. */
export function generateDemoSessions(opts: DemoOptions): SleepSession[] {
  const nights = opts.nights ?? 60;
  const rnd = mulberry32((opts.seed ?? 42) + opts.scenario.length * 7919);
  const out: SleepSession[] = [];
  for (let i = nights - 1; i >= 0; i--) {
    const wakeKey = addDaysToKey(opts.lastWakeKey, -i);
    const plan = planFor(opts.scenario, nights - 1 - i, wakeKey, rnd);
    const bedDayKey = plan.bed >= 24 ? addDaysToKey(wakeKey, -Math.ceil((48 - plan.bed) / 24) + 1) : addDaysToKey(wakeKey, -1);
    const bedClock = formatHHmm(plan.bed % 24);
    // bed day: bedtime clocks >= 24 belong to the date of waking (or the day before for day sleepers)
    const bedKey = plan.bed >= 24 ? addDaysToKey(wakeKey, plan.bed >= 36 ? -1 : 0) : bedDayKey;
    const startAt = localTimeToMs(bedKey, bedClock, opts.tz);
    const endAt = startAt + Math.round(plan.durationMin) * 60_000;
    const effKey = dateKey(endAt, opts.tz);
    // keep the wake date consistent with the plan, even if jitter crossed midnight
    if (effKey !== wakeKey) {
      const shift = (localTimeToMs(wakeKey, '07:00', opts.tz) - endAt) / 60_000;
      if (Math.abs(shift) > 24 * 60) continue;
    }
    out.push({
      id: `demo-${opts.scenario}-${wakeKey}`,
      startAt,
      endAt,
      asleepMinutes: Math.round(plan.durationMin * (0.9 + rnd() * 0.06)),
      source: 'demo',
      sourceDetail: 'Demo',
      confidence: 0.9,
      isNap: false,
      timezone: opts.tz,
      userEdited: false,
    });
    if (opts.scenario !== 'shift_worker' && rnd() < 0.12) {
      const napStart = localTimeToMs(dateKey(endAt, opts.tz), '14:10', opts.tz) + Math.round(rnd() * 45) * 60_000;
      out.push({
        id: `demo-${opts.scenario}-nap-${wakeKey}`,
        startAt: napStart,
        endAt: napStart + Math.round(20 + rnd() * 25) * 60_000,
        asleepMinutes: null,
        source: 'demo',
        sourceDetail: 'Demo',
        confidence: 0.8,
        isNap: true,
        timezone: opts.tz,
        userEdited: false,
      });
    }
  }
  return out.sort((a, b) => a.startAt - b.startAt);
}

export function demoProfile(scenario: DemoScenarioId, tz: string, now: number): Profile {
  const sc = DEMO_SCENARIOS.find((s) => s.id === scenario)!;
  return {
    name: 'Demo',
    birthYear: 1994,
    sleepNeedMinutesManual: null,
    sleepNeedMinutesEstimated: scenario === 'late_early_shift' ? 510 : 480,
    chronotype: 'intermediate',
    chronotypeScore: 0,
    circadianPhaseOffsetMin: 0,
    targetWakeTime: scenario === 'late_early_shift' ? '06:30' : null,
    workSchedule: WORK,
    caffeineCutoffHours: 8,
    timezone: tz,
    ...sc.profile,
  } as Profile & { _now?: number };
}
