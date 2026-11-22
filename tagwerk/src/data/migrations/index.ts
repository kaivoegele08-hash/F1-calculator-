/** Versioned SQL migrations. Never edit an applied migration, append a new one. */
export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY,
        created_at INTEGER NOT NULL,
        name TEXT,
        birth_year INTEGER,
        sleep_need_minutes_manual INTEGER,
        sleep_need_minutes_estimated REAL,
        chronotype TEXT NOT NULL,
        chronotype_score REAL NOT NULL,
        circadian_phase_offset_min REAL NOT NULL,
        chronotype_updated_at INTEGER,
        target_wake_time TEXT,
        work_schedule TEXT NOT NULL,
        caffeine_cutoff_hours REAL NOT NULL,
        timezone TEXT NOT NULL,
        onboarding_completed_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS sleep_session (
        id TEXT PRIMARY KEY,
        start_at INTEGER NOT NULL,
        end_at INTEGER NOT NULL,
        asleep_minutes REAL,
        source TEXT NOT NULL,
        source_detail TEXT,
        confidence REAL NOT NULL,
        is_nap INTEGER NOT NULL,
        timezone TEXT NOT NULL,
        user_edited INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sleep_session_end ON sleep_session (end_at)`,
      `CREATE TABLE IF NOT EXISTS daily_summary (
        date TEXT PRIMARY KEY,
        total_sleep_minutes REAL NOT NULL,
        nap_minutes REAL NOT NULL,
        sleep_debt_minutes REAL NOT NULL,
        sleep_need_minutes REAL NOT NULL,
        energy_curve_json TEXT NOT NULL,
        windows_json TEXT NOT NULL,
        computed_at INTEGER NOT NULL,
        engine_version INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS habit (
        key TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL,
        reminder_enabled INTEGER NOT NULL,
        reminder_offset_min INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS habit_log (
        habit_key TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        at INTEGER NOT NULL,
        PRIMARY KEY (habit_key, date)
      )`,
      `CREATE TABLE IF NOT EXISTS energy_checkin (
        id TEXT PRIMARY KEY,
        at INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        note TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS setting (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    ],
  },
];
