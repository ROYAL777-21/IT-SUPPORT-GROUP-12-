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

  {
    version: 2,
    statements: [
      /*
       * Local cache of `users/{uid}`. Keeps the profile screen and the
       * pre-filled ticket form working offline, and means a student types
       * their student number once rather than on every ticket.
       */
      `CREATE TABLE IF NOT EXISTS user_profiles (
        uid            TEXT PRIMARY KEY NOT NULL,
        email          TEXT NOT NULL,
        display_name   TEXT NOT NULL,
        student_number TEXT,
        campus         TEXT,
        role           TEXT NOT NULL DEFAULT 'student',
        provider_id    TEXT NOT NULL DEFAULT 'unknown',
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL
      );`,

      /*
       * Denormalised so the queue can show "Assigned to Thandi" without a
       * second read. `assigned_to` alone is a uid and means nothing on screen.
       */
      `ALTER TABLE tickets ADD COLUMN assigned_to_name TEXT;`,

      /*
       * Support agents list the queue by status and recency, which the
       * created_by index cannot serve.
       */
      `CREATE INDEX IF NOT EXISTS idx_tickets_status
         ON tickets (status, updated_at DESC);`,

      `CREATE INDEX IF NOT EXISTS idx_tickets_assigned
         ON tickets (assigned_to, updated_at DESC);`,

      /* Comments are pulled now, not just pushed, so they need a sync index. */
      `CREATE INDEX IF NOT EXISTS idx_comments_sync_state
         ON ticket_comments (sync_state);`,
    ],
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
