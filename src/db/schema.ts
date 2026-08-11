/**
 * SQLite schema for the on-device cache.
 *
 * Migrations are applied in order and tracked with SQLite's own `user_version`
 * pragma, so adding a migration is append-only: push a new entry onto
 * MIGRATIONS and every existing install picks it up on next launch.
 */

export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS tickets (
        id            TEXT PRIMARY KEY NOT NULL,
        reference     TEXT NOT NULL,
        student_number TEXT NOT NULL,
        campus        TEXT NOT NULL,
        category      TEXT NOT NULL,
        priority      TEXT NOT NULL,
        status        TEXT NOT NULL,
        subject       TEXT NOT NULL,
        description   TEXT NOT NULL,
        location      TEXT,
        assigned_to   TEXT,
        created_by    TEXT NOT NULL,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        sync_state    TEXT NOT NULL DEFAULT 'pending',
        deleted       INTEGER NOT NULL DEFAULT 0
      );`,

      `CREATE INDEX IF NOT EXISTS idx_tickets_created_by
         ON tickets (created_by, updated_at DESC);`,

      `CREATE INDEX IF NOT EXISTS idx_tickets_sync_state
         ON tickets (sync_state);`,

      `CREATE TABLE IF NOT EXISTS ticket_comments (
        id          TEXT PRIMARY KEY NOT NULL,
        ticket_id   TEXT NOT NULL,
        author_id   TEXT NOT NULL,
        author_name TEXT NOT NULL,
        from_support INTEGER NOT NULL DEFAULT 0,
        body        TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        sync_state  TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
      );`,

      `CREATE INDEX IF NOT EXISTS idx_comments_ticket
         ON ticket_comments (ticket_id, created_at ASC);`,

      /* Single-row bookkeeping table for the incremental pull cursor. */
      `CREATE TABLE IF NOT EXISTS sync_meta (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );`,
    ],
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
