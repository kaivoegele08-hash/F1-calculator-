import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { SqliteStore, type SyncDb } from './sqliteStore';
import type { DataStore } from './types';

/** iOS / Android: SQLite through expo-sqlite and Drizzle ORM. */
export function createStore(): DataStore {
  const sqlite = openDatabaseSync('tagwerk.db');
  return new SqliteStore(drizzle(sqlite) as unknown as SyncDb);
}
