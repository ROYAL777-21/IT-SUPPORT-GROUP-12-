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

  {
    /*
     * Fold the taxonomy onto the one in the Campus IT Help design, which
     * arrived after v2 and is shorter than what was guessed in its absence:
     * five categories, three priorities, three statuses.
     *
     * These columns are plain TEXT with no CHECK constraint, so nothing here
     * alters the schema — it rewrites rows. Without it, a ticket logged before
     * today keeps a value the app no longer has a label for and renders blank,
     * which looks like data loss and is worse than the value being wrong.
     *
     * Rows are not marked sync_state='pending'. This is a local relabelling to
     * match the UI, not a user edit, and flagging every historical row would
     * push the whole cache back to Firestore on next launch.
     */
    version: 3,
    statements: [
      /* 'urgent' folds into the highest level that survives. */
      `UPDATE tickets SET priority = 'high' WHERE priority = 'urgent';`,

      /*
       * 'awaiting_student' meant "support is waiting on the reporter" — still
       * live work, so in_progress. 'closed' was the terminal state after
       * 'resolved' and is now indistinguishable from it.
       */
      `UPDATE tickets SET status = 'in_progress' WHERE status = 'awaiting_student';`,
      `UPDATE tickets SET status = 'resolved' WHERE status = 'closed';`,

      /*
       * Login, student email and the learning portal were three separate
       * categories; the design has one Student Portal covering all of them.
       * Printing is a lab-equipment problem, so it joins Hardware & Labs.
       */
      `UPDATE tickets SET category = 'portal'
         WHERE category IN ('account', 'email', 'lms');`,
      `UPDATE tickets SET category = 'hardware' WHERE category = 'printing';`,

      /* Anything else unrecognised lands in Other rather than rendering blank. */
      `UPDATE tickets SET category = 'other'
         WHERE category NOT IN ('wifi', 'portal', 'hardware', 'software', 'other');`,
    ],
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
