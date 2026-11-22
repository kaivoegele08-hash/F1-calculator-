import { z } from 'zod';
import type { SleepSession } from '@/engine/types';
import { EXPORT_SCHEMA_VERSION, type DataStore, type ExportBundle, type ImportPreview } from './types';

const workSchedule = z.object({
  workDays: z.array(z.number().int().min(0).max(6)),
  workStart: z.string(),
  workEnd: z.string(),
  shiftMode: z.boolean(),
});

const session = z.object({
  id: z.string().min(1),
  startAt: z.number(),
  endAt: z.number(),
  asleepMinutes: z.number().nullable().optional(),
  source: z.enum(['healthkit', 'healthconnect', 'manual', 'phone_inferred', 'demo']),
  sourceDetail: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  isNap: z.boolean(),
  timezone: z.string(),
  userEdited: z.boolean(),
});

const profile = z.object({
  createdAt: z.number(),
  name: z.string().nullable().optional(),
  birthYear: z.number().int().nullable().optional(),
  sleepNeedMinutesManual: z.number().nullable().optional(),
  sleepNeedMinutesEstimated: z.number().nullable().optional(),
  chronotype: z.enum(['early', 'intermediate', 'late']),
  chronotypeScore: z.number(),
  circadianPhaseOffsetMin: z.number(),
  chronotypeUpdatedAt: z.number().nullable(),
  targetWakeTime: z.string().nullable().optional(),
  workSchedule,
  caffeineCutoffHours: z.number(),
  timezone: z.string(),
  onboardingCompletedAt: z.number().nullable(),
});

const habitKey = z.enum([
  'morning_light',
  'caffeine_cutoff',
  'no_alcohol',
  'last_meal',
  'dim_light',
  'wind_down',
  'bedtime',
  'bedroom_check',
  'powernap',
]);

export const bundleSchema = z.object({
  schemaVersion: z.number().int().min(1).max(EXPORT_SCHEMA_VERSION),
  exportedAt: z.number(),
  profile: profile.nullable(),
  sessions: z.array(session),
  habits: z.array(
    z.object({ key: habitKey, enabled: z.boolean(), reminderEnabled: z.boolean(), reminderOffsetMin: z.number() }),
  ),
  habitLogs: z.array(
    z.object({ habitKey, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: z.enum(['done', 'skipped']), at: z.number() }),
  ),
  checkins: z.array(
    z.object({ id: z.string(), at: z.number(), rating: z.number().int().min(1).max(5), note: z.string().nullable().optional() }),
  ),
});

export type ParseResult = { ok: true; bundle: ExportBundle } | { ok: false; error: string };

/** Validate a JSON string from an export file. */
export function parseBundle(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
  const res = bundleSchema.safeParse(raw);
  if (!res.success) {
    const first = res.error.issues[0];
    return { ok: false, error: `Ungültige Datei (${first.path.join('.') || 'Wurzel'}: ${first.message}).` };
  }
  return { ok: true, bundle: res.data as ExportBundle };
}

const sameNight = (a: SleepSession, b: SleepSession) =>
  a.id === b.id || (Math.abs(a.startAt - b.startAt) < 60_000 && Math.abs(a.endAt - b.endAt) < 60_000);

export function previewImport(bundle: ExportBundle, existing: SleepSession[]): ImportPreview {
  const seen = [...existing];
  const fresh: SleepSession[] = [];
  let dupes = 0;
  for (const s of bundle.sessions) {
    if (seen.some((e) => sameNight(e, s))) {
      dupes++;
    } else {
      fresh.push(s);
      seen.push(s);
    }
  }
  return { nightsFound: bundle.sessions.length, duplicatesSkipped: dupes, newSessions: fresh };
}

/** Apply an import. Existing nights win; the profile is only taken if none exists yet. */
export async function applyImport(store: DataStore, bundle: ExportBundle): Promise<ImportPreview> {
  const preview = previewImport(bundle, await store.listSessions());
  await store.upsertSessions(preview.newSessions);
  if (bundle.profile && !(await store.getProfile())) await store.saveProfile(bundle.profile);
  for (const h of bundle.habits) await store.saveHabit(h);
  for (const l of bundle.habitLogs) await store.setHabitLog(l);
  for (const c of bundle.checkins) await store.addCheckin(c);
  await store.clearSummaries();
  return preview;
}
