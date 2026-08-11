import * as SQLite from 'expo-sqlite';

import { LATEST_VERSION, MIGRATIONS } from './schema';

const DATABASE_NAME = 'campus-it-help.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the database once per process and runs any outstanding migrations.
 * Concurrent callers share the same promise, so migrations never run twice.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open();
  }
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // WAL keeps reads from blocking behind a sync write, which matters because
  // the sync service writes in the background while the UI is reading.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  if (current >= LATEST_VERSION) {
    return;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
    });

    // PRAGMA does not accept bound parameters, and `version` is a number we
    // control in schema.ts, so interpolation here is safe.
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
}

/** Drops the local cache. Used on sign-out so the next user starts clean. */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM ticket_comments;');
    await db.execAsync('DELETE FROM tickets;');
    await db.execAsync('DELETE FROM sync_meta;');
  });
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?;',
    [key],
  );
  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}
