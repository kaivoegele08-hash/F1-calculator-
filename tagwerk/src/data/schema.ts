import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  name: text('name'),
  birthYear: integer('birth_year'),
  sleepNeedMinutesManual: integer('sleep_need_minutes_manual'),
  sleepNeedMinutesEstimated: real('sleep_need_minutes_estimated'),
  chronotype: text('chronotype').notNull(),
  chronotypeScore: real('chronotype_score').notNull(),
  circadianPhaseOffsetMin: real('circadian_phase_offset_min').notNull(),
  chronotypeUpdatedAt: integer('chronotype_updated_at'),
  targetWakeTime: text('target_wake_time'),
  workSchedule: text('work_schedule').notNull(),
  caffeineCutoffHours: real('caffeine_cutoff_hours').notNull(),
  timezone: text('timezone').notNull(),
  onboardingCompletedAt: integer('onboarding_completed_at'),
});

export const sleepSession = sqliteTable('sleep_session', {
  id: text('id').primaryKey(),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at').notNull(),
  asleepMinutes: real('asleep_minutes'),
  source: text('source').notNull(),
  sourceDetail: text('source_detail'),
  confidence: real('confidence').notNull(),
  isNap: integer('is_nap', { mode: 'boolean' }).notNull(),
  timezone: text('timezone').notNull(),
  userEdited: integer('user_edited', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const dailySummary = sqliteTable('daily_summary', {
  date: text('date').primaryKey(),
  totalSleepMinutes: real('total_sleep_minutes').notNull(),
  napMinutes: real('nap_minutes').notNull(),
  sleepDebtMinutes: real('sleep_debt_minutes').notNull(),
  sleepNeedMinutes: real('sleep_need_minutes').notNull(),
  energyCurveJson: text('energy_curve_json').notNull(),
  windowsJson: text('windows_json').notNull(),
  computedAt: integer('computed_at').notNull(),
  engineVersion: integer('engine_version').notNull(),
});

export const habit = sqliteTable('habit', {
  key: text('key').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull(),
  reminderOffsetMin: integer('reminder_offset_min').notNull(),
});

export const habitLog = sqliteTable('habit_log', {
  habitKey: text('habit_key').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull(),
  at: integer('at').notNull(),
});

export const energyCheckin = sqliteTable('energy_checkin', {
  id: text('id').primaryKey(),
  at: integer('at').notNull(),
  rating: integer('rating').notNull(),
  note: text('note'),
});

export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const migrationLog = sqliteTable('migration_log', {
  version: integer('version').primaryKey(),
  appliedAt: integer('applied_at').notNull(),
});
