import { HOUR, MIN } from './constants';
import type { DayPlan } from './dayPlan';
import { addDaysToKey, hourOfDay, stddev } from './time';
import type { Profile, SleepSession } from './types';
import { buildSleepDays } from './sleepDetection';

export interface Tip {
  id: string;
  title: string;
  body: string;
  ctaHabitKey?: string;
  librarySlug?: string;
}

export interface TipContext {
  plan: DayPlan;
  sessions: SleepSession[];
  profile: Profile;
  /** YYYY-MM-DD of today */
  today: string;
  /** tip ids shown on earlier dates */
  history: Record<string, string[]>;
  /** days in the last two weeks on which the caffeine habit was ticked after the cut-off */
  caffeineLateDays?: number;
  socialJetlagHours?: number;
}

const TIPS: Record<string, Tip> = {
  debt_high: {
    id: 'debt_high',
    title: 'Heute früher ins Bett',
    body: 'Deine Schlafschuld ist hoch. Geh heute 30–60 Minuten früher schlafen. Ein kurzer Powernap am Nachmittag hilft zusätzlich, aber nicht zu spät.',
    ctaHabitKey: 'bedtime',
    librarySlug: 'was-ist-schlafschuld',
  },
  debt_mid: {
    id: 'debt_mid',
    title: 'Etwas aufholen',
    body: 'Deine Schlafschuld ist spürbar. Schon 20–30 Minuten mehr Schlaf an mehreren Abenden bauen sie Schritt für Schritt ab.',
    ctaHabitKey: 'bedtime',
    librarySlug: 'was-ist-schlafschuld',
  },
  groggy_long: {
    id: 'groggy_long',
    title: 'Schneller wach werden',
    body: 'Du bist morgens lange benommen. Geh in der ersten Stunde ans Tageslicht, trink ein Glas Wasser und beweg dich ein paar Minuten.',
    ctaHabitKey: 'morning_light',
    librarySlug: 'schlaftraegheit',
  },
  regularity: {
    id: 'regularity',
    title: 'Regelmäßigkeit ist dein größter Hebel',
    body: 'Deine Schlafenszeit schwankt stark. Versuch, sie an den nächsten Tagen innerhalb von 30 Minuten zu halten.',
    ctaHabitKey: 'bedtime',
    librarySlug: 'wie-die-innere-uhr-funktioniert',
  },
  caffeine_halflife: {
    id: 'caffeine_halflife',
    title: 'Koffein hält länger, als man denkt',
    body: 'Koffein braucht etwa fünf bis sechs Stunden, bis die Hälfte abgebaut ist. Der Koffein-Stopp hilft dir beim Einschlafen.',
    ctaHabitKey: 'caffeine_cutoff',
    librarySlug: 'koffein-und-halbwertszeit',
  },
  social_jetlag: {
    id: 'social_jetlag',
    title: 'Dein Wochenende verschiebt deine Uhr',
    body: 'Du schläfst an freien Tagen deutlich später als an Arbeitstagen. Verschiebe deine freien Tage schrittweise, 15 Minuten alle paar Tage.',
    librarySlug: 'social-jetlag',
  },
  clock_adapting: {
    id: 'clock_adapting',
    title: 'Deine innere Uhr stellt sich um',
    body: 'Sie passt sich gerade an neue Zeiten an, höchstens eine Stunde pro Tag. Morgenlicht und feste Zeiten beschleunigen das.',
    ctaHabitKey: 'morning_light',
    librarySlug: 'schichtarbeit',
  },
  morning_light: {
    id: 'morning_light',
    title: 'Raus ans Licht',
    body: 'Zehn bis dreißig Minuten Tageslicht am Morgen stellen deine innere Uhr und machen dich schneller wach.',
    ctaHabitKey: 'morning_light',
    librarySlug: 'licht-am-morgen',
  },
  nap: {
    id: 'nap',
    title: 'Der richtige Powernap',
    body: 'Im Nachmittagstief hilft ein Nap von höchstens 20 Minuten. Stell dir einen Wecker und schlaf nicht zu spät.',
    ctaHabitKey: 'powernap',
    librarySlug: 'powernaps-richtig',
  },
  wind_down: {
    id: 'wind_down',
    title: 'Abends runterfahren',
    body: 'Dimm eine Stunde vor dem Melatonin-Fenster das Licht und leg Bildschirme weg. So fällt das Einschlafen leichter.',
    ctaHabitKey: 'wind_down',
    librarySlug: 'einschlafen-wenns-nicht-klappt',
  },
};

export const ALL_TIP_IDS = Object.keys(TIPS);

function bedtimeSpread(sessions: SleepSession[], profile: Profile, today: string): number {
  const days = buildSleepDays(sessions, profile.timezone, profile.workSchedule.shiftMode);
  const hours: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = days.get(addDaysToKey(today, -i));
    if (d?.bedAt != null) {
      const h = hourOfDay(d.bedAt, profile.timezone);
      hours.push(h < 12 ? h + 24 : h);
    }
  }
  return hours.length >= 4 ? stddev(hours) * 60 : 0;
}

/** True when the tip was shown on each of the previous two days. */
function repeatedTooLong(id: string, today: string, history: Record<string, string[]>): boolean {
  return [1, 2].every((n) => (history[addDaysToKey(today, -n)] ?? []).includes(id));
}

/** Rule-based selection of 1-3 tips (5.9). */
export function selectTips(ctx: TipContext): Tip[] {
  const { plan, sessions, profile, today, history } = ctx;
  const ordered: string[] = [];
  const debt = plan.debt.debtMinutes;
  if (debt > 600) ordered.push('debt_high');
  if ((plan.features.grogginessEnd - plan.wakeAt) / MIN > 90) ordered.push('groggy_long');
  if (plan.phase.adapting) ordered.push('clock_adapting');
  if (bedtimeSpread(sessions, profile, today) > 90) ordered.push('regularity');
  if ((ctx.caffeineLateDays ?? 0) >= 3) ordered.push('caffeine_halflife');
  if ((ctx.socialJetlagHours ?? 0) > 2) ordered.push('social_jetlag');
  if (debt >= 300 && debt <= 600) ordered.push('debt_mid');
  ordered.push('morning_light', 'nap', 'wind_down');

  const picked: Tip[] = [];
  for (const id of ordered) {
    if (picked.length >= 3) break;
    if (!repeatedTooLong(id, today, history)) picked.push(TIPS[id]);
  }
  if (picked.length === 0) picked.push(TIPS.morning_light);
  return picked;
}

export const hoursOf = (ms: number) => ms / HOUR;
