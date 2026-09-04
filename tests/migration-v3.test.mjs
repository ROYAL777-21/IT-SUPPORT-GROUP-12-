import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

/**
 * Migration v3 folds the ticket taxonomy onto the one in the Campus IT Help
 * design. It rewrites rows rather than altering the schema, which makes it
 * exactly the kind of change that fails silently: nothing throws, a ticket just
 * renders with a blank status forever.
 *
 * So this runs the real statements — parsed out of schema.ts rather than
 * retyped, or the test would drift from the code the app ships — against a real
 * SQLite database.
 */

function migrationStatements(version) {
  const source = readFileSync(new URL('../src/db/schema.ts', import.meta.url), 'utf8');

  const start = source.indexOf(`version: ${version},`);
  assert.notEqual(start, -1, `migration v${version} not found in schema.ts`);

  // Statements are backtick template literals between this version marker and
  // the end of its statements array.
  const end = source.indexOf('],', start);
  return [...source.slice(start, end).matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

const RETIRED_ROWS = [
  { id: 'a', priority: 'urgent', status: 'open', category: 'wifi' },
  { id: 'b', priority: 'high', status: 'awaiting_student', category: 'account' },
  { id: 'c', priority: 'low', status: 'closed', category: 'email' },
  { id: 'd', priority: 'medium', status: 'resolved', category: 'lms' },
  { id: 'e', priority: 'low', status: 'open', category: 'printing' },
  { id: 'f', priority: 'medium', status: 'in_progress', category: 'nonsense' },
  { id: 'g', priority: 'high', status: 'open', category: 'software' },
];

function seed() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE tickets (
    id TEXT PRIMARY KEY NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    category TEXT NOT NULL
  );`);

  const insert = db.prepare(
    'INSERT INTO tickets (id, priority, status, category) VALUES (?, ?, ?, ?);',
  );
  for (const row of RETIRED_ROWS) {
    insert.run(row.id, row.priority, row.status, row.category);
  }
  return db;
}

describe('migration v3 — taxonomy fold', () => {
  const statements = migrationStatements(3);

  it('parses the real statements out of schema.ts', () => {
    assert.ok(statements.length >= 6, `expected the UPDATEs, got ${statements.length}`);
  });

  it('leaves no retired value behind', () => {
    const db = seed();
    for (const statement of statements) db.exec(statement);

    const rows = db.prepare('SELECT id, priority, status, category FROM tickets;').all();
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    // Every mapping in the migration's own comment, asserted individually so a
    // failure names which one broke.
    assert.equal(byId.a.priority, 'high', 'urgent -> high');
    assert.equal(byId.b.status, 'in_progress', 'awaiting_student -> in_progress');
    assert.equal(byId.c.status, 'resolved', 'closed -> resolved');
    assert.equal(byId.b.category, 'portal', 'account -> portal');
    assert.equal(byId.c.category, 'portal', 'email -> portal');
    assert.equal(byId.d.category, 'portal', 'lms -> portal');
    assert.equal(byId.e.category, 'hardware', 'printing -> hardware');
    assert.equal(byId.f.category, 'other', 'unrecognised -> other');

    const priorities = new Set(rows.map((row) => row.priority));
    const statuses = new Set(rows.map((row) => row.status));
    const categories = new Set(rows.map((row) => row.category));

    for (const value of priorities) assert.ok(['low', 'medium', 'high'].includes(value), value);
    for (const value of statuses) {
      assert.ok(['open', 'in_progress', 'resolved'].includes(value), value);
    }
    for (const value of categories) {
      assert.ok(['wifi', 'portal', 'hardware', 'software', 'other'].includes(value), value);
    }
  });

  it('leaves already-valid rows untouched', () => {
    const db = seed();
    const before = db.prepare("SELECT * FROM tickets WHERE id = 'g';").get();
    for (const statement of statements) db.exec(statement);
    const after = db.prepare("SELECT * FROM tickets WHERE id = 'g';").get();

    assert.deepEqual(after, before);
  });

  it('is idempotent — running it twice changes nothing', () => {
    const db = seed();
    for (const statement of statements) db.exec(statement);
    const once = db.prepare('SELECT * FROM tickets ORDER BY id;').all();
    for (const statement of statements) db.exec(statement);
    const twice = db.prepare('SELECT * FROM tickets ORDER BY id;').all();

    assert.deepEqual(twice, once);
  });
});
