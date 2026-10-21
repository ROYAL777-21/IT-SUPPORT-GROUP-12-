import * as SQLite from 'expo-sqlite';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

import { LATEST_VERSION, MIGRATIONS } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let activeUserId: string | null = null;

/** Each account keeps its own offline queue, including unsent changes. */
export function activateDatabase(userId: string): Promise<SQLite.SQLiteDatabase> {
  if (activeUserId !== userId || !dbPromise) {
    activeUserId = userId;
    dbPromise = digestStringAsync(CryptoDigestAlgorithm.SHA256, userId)
      .then((key) => open(`campus-it-help-${key}.db`, userId));
  }
  return dbPromise;
}

export function deactivateDatabase(): void {
  activeUserId = null;
  dbPromise = null;
}

/**
 * Opens the database once per process and runs any outstanding migrations.
 * Concurrent callers share the same promise, so migrations never run twice.
 */
export function getDatabase(userId?: string): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise || (userId && activeUserId !== userId)) {
    return Promise.reject(new Error('Sign in to access your saved data.'));
  }
  return dbPromise;
}

async function open(name: string, userId: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(name);

  // WAL keeps reads from blocking behind a sync write, which matters because
  // the sync service writes in the background while the UI is reading.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await migrate(db);
  await importLegacyCache(db, userId);
  return db;
}

/** Import an older shared cache only when its sole profile proves account ownership. */
async function importLegacyCache(db: SQLite.SQLiteDatabase, owner: string): Promise<void> {
  if (await getSyncMeta('legacyImported', db)) return;
  const legacy = await SQLite.openDatabaseAsync('campus-it-help.db');
  const table = await legacy.getFirstAsync("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_profiles';");
  if (!table) return;
  const profiles = await legacy.getAllAsync<{ uid: string }>('SELECT uid FROM user_profiles;');
  if (profiles.length !== 1 || profiles[0].uid !== owner) return;
  await migrate(legacy);
  const tables = ['tickets', 'ticket_comments', 'user_profiles'] as const;
  const contents = await Promise.all(tables.map((name) => legacy.getAllAsync<Record<string, string | number | null>>(`SELECT * FROM ${name};`)));
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let index = 0; index < tables.length; index++) {
      for (const row of contents[index]) {
        const keys = Object.keys(row);
        // Column names come exclusively from our local schema, never user input.
        await txn.runAsync(`INSERT OR IGNORE INTO ${tables[index]} (${keys.map((key) => `"${key}"`).join(',')}) VALUES (${keys.map(() => '?').join(',')});`, Object.values(row));
      }
    }
    await txn.runAsync("INSERT INTO sync_meta (key, value) VALUES ('legacyImported', '1');");
  });
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

    // Exclusive rather than plain: withTransactionAsync sweeps *any* query
    // that happens to run while it is open into the transaction, including
    // reads the UI kicks off at launch. A half-applied schema is not something
    // to leave to timing.
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const statement of migration.statements) {
        await txn.execAsync(statement);
      }
      await txn.execAsync(`PRAGMA user_version = ${migration.version};`);
    });

    // PRAGMA does not accept bound parameters, and `version` is a number we
    // control in schema.ts, so interpolation here is safe.
  }
}

export async function getSyncMeta(key: string, database?: SQLite.SQLiteDatabase): Promise<string | null> {
  const db = database ?? await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?;',
    [key],
  );
  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string, database?: SQLite.SQLiteDatabase): Promise<void> {
  const db = database ?? await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}
