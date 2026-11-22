import type { Habit, HabitKey } from '@/data/types';
import type { WindowKind } from '@/engine/types';

export interface HabitMeta {
  key: HabitKey;
  title: string;
  short: string;
  /** which window the reminder is anchored to */
  anchor: WindowKind | 'wake' | 'bedtime_minus_alcohol';
  /** default reminder offset in minutes relative to the anchor */
  defaultOffsetMin: number;
  defaultEnabled: boolean;
  defaultReminder: boolean;
  notification: { title: string; body: string };
  why: string;
  librarySlug?: string;
}

export const HABITS: HabitMeta[] = [
  {
    key: 'morning_light',
    title: 'Morgenlicht',
    short: '10–30 Minuten ins Tageslicht',
    anchor: 'wake',
    defaultOffsetMin: 20,
    defaultEnabled: true,
    defaultReminder: true,
    notification: {
      title: '☀️ Raus ans Licht',
      body: '10 Minuten Tageslicht machen dich schneller wach.',
    },
    why: 'Helles Licht am Morgen sagt deiner inneren Uhr: Der Tag beginnt. Du wirst schneller klar im Kopf und abends zur richtigen Zeit müde. Auch ein bewölkter Himmel ist draußen deutlich heller als jede Lampe drinnen.',
    librarySlug: 'licht-am-morgen',
  },
  {
    key: 'caffeine_cutoff',
    title: 'Koffein-Stopp',
    short: 'Letzter Kaffee für heute',
    anchor: 'caffeine_stop',
    defaultOffsetMin: -30,
    defaultEnabled: true,
    defaultReminder: true,
    notification: {
      title: '☕ Letzter Kaffee für heute',
      body: 'Danach schläfst du besser ein.',
    },
    why: 'Koffein braucht fünf bis sechs Stunden, bis die Hälfte abgebaut ist. Ein später Kaffee blockiert den Schlafdruck noch am Abend, auch wenn du dich müde fühlst.',
    librarySlug: 'koffein-und-halbwertszeit',
  },
  {
    key: 'no_alcohol',
    title: 'Kein Alkohol vor dem Schlafen',
    short: '3 Stunden vor dem Schlafen nichts mehr trinken',
    anchor: 'last_meal',
    defaultOffsetMin: 0,
    defaultEnabled: false,
    defaultReminder: false,
    notification: { title: '🍷 Letzter Drink', body: 'Alkohol kurz vor dem Schlafen macht die zweite Nachthälfte unruhig.' },
    why: 'Alkohol macht schneller müde, stört aber den Schlaf in der zweiten Nachthälfte. Du wachst häufiger auf und erholst dich weniger. Drei Stunden Abstand reichen oft schon.',
    librarySlug: 'alkohol-und-schlaf',
  },
  {
    key: 'last_meal',
    title: 'Letzte große Mahlzeit',
    short: '3 Stunden vor der Schlafenszeit',
    anchor: 'last_meal',
    defaultOffsetMin: 0,
    defaultEnabled: false,
    defaultReminder: false,
    notification: { title: '🍽️ Letzte große Mahlzeit', body: 'Danach nur noch leichte Snacks.' },
    why: 'Ein voller Magen hält deinen Körper beim Verdauen auf Trab und stört das Einschlafen. Plan die letzte große Mahlzeit etwa drei Stunden vor dem Schlafen.',
  },
  {
    key: 'dim_light',
    title: 'Licht dimmen',
    short: 'Weniger Licht, Bildschirme weglegen',
    anchor: 'dim_light',
    defaultOffsetMin: 0,
    defaultEnabled: false,
    defaultReminder: false,
    notification: { title: '💡 Licht dimmen', body: 'Warmes, schwaches Licht hilft Melatonin beim Steigen.' },
    why: 'Helles, kaltes Licht am Abend verschiebt dein Melatonin nach hinten. Gedimmtes, warmes Licht lässt deine innere Uhr rechtzeitig auf Nacht umschalten.',
  },
  {
    key: 'wind_down',
    title: 'Wind-down-Routine',
    short: 'Eine Stunde vor dem Melatonin-Fenster runterfahren',
    anchor: 'wind_down',
    defaultOffsetMin: 0,
    defaultEnabled: true,
    defaultReminder: true,
    notification: {
      title: '🌙 Zeit runterzufahren',
      body: 'Dein Melatonin-Fenster öffnet sich in einer Stunde.',
    },
    why: 'Eine feste, ruhige Routine vor dem Schlafen senkt deine Anspannung. Lesen, Dehnen oder die Atemübung zeigen deinem Körper: Gleich ist Schlafenszeit.',
    librarySlug: 'einschlafen-wenns-nicht-klappt',
  },
  {
    key: 'bedtime',
    title: 'Schlafenszeit',
    short: 'Zur empfohlenen Zeit ins Bett',
    anchor: 'bedtime',
    defaultOffsetMin: -10,
    defaultEnabled: true,
    defaultReminder: true,
    notification: { title: '🛏️ Zeit fürs Bett', body: 'Jetzt geht Schlafschuld am schnellsten runter.' },
    why: 'Regelmäßige Schlafenszeiten sind der größte Hebel für guten Schlaf. Deine innere Uhr lernt, zur gleichen Zeit müde zu werden.',
    librarySlug: 'was-ist-schlafschuld',
  },
  {
    key: 'bedroom_check',
    title: 'Schlafzimmer kühl & dunkel',
    short: 'Abend-Check fürs Schlafzimmer',
    anchor: 'wind_down',
    defaultOffsetMin: 15,
    defaultEnabled: false,
    defaultReminder: false,
    notification: { title: '🌡️ Schlafzimmer-Check', body: 'Kühl lüften, abdunkeln, Handy außer Reichweite.' },
    why: 'Dein Körper braucht zum Einschlafen eine sinkende Körpertemperatur. Etwa 16–19 Grad und Dunkelheit helfen dabei und verhindern frühes Aufwachen.',
  },
  {
    key: 'powernap',
    title: 'Powernap',
    short: 'Höchstens 20 Minuten im Nachmittagstief',
    anchor: 'nap',
    defaultOffsetMin: 0,
    defaultEnabled: false,
    defaultReminder: false,
    notification: { title: '😴 Powernap-Zeit', body: 'Höchstens 20 Minuten, mit Wecker.' },
    why: 'Ein kurzer Nap im Nachmittagstief bringt Energie zurück, ohne den Nachtschlaf zu stören. Bleib unter 20 Minuten, sonst wachst du benommen auf.',
    librarySlug: 'powernaps-richtig',
  },
];

export const HABIT_BY_KEY: Record<HabitKey, HabitMeta> = Object.fromEntries(
  HABITS.map((h) => [h.key, h]),
) as Record<HabitKey, HabitMeta>;

export function defaultHabits(): Habit[] {
  return HABITS.map((h) => ({
    key: h.key,
    enabled: h.defaultEnabled,
    reminderEnabled: h.defaultReminder,
    reminderOffsetMin: h.defaultOffsetMin,
  }));
}
