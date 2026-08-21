import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

/**
 * Rules tests, run against the Firestore emulator.
 *
 * These exist because firestore.rules is the only enforcement that counts.
 * Everything the app checks client-side — the institutional domain, who may
 * assign a ticket, who may post as support — is a nicety for error messages
 * and is trivially bypassed by anyone talking to Firestore directly.
 */

const PROJECT_ID = 'campus-it-help-rules-test';

const STUDENT = { sub: 'student-1', email: 'thandi@eduvos.ac.za', email_verified: true };
const OTHER_STUDENT = { sub: 'student-2', email: 'sipho@eduvos.ac.za', email_verified: true };
const OUTSIDER = { sub: 'outsider-1', email: 'someone@outlook.com', email_verified: true };
const AGENT = { sub: 'agent-1', email: 'itdesk@eduvos.com', email_verified: true, support: true };

let testEnv;

/** A ticket exactly as ticketRepository.createTicket() would write it. */
function ticketFor(uid, overrides = {}) {
  return {
    id: 'ticket-1',
    reference: 'EDU-ABC234',
    studentNumber: 'ST12345',
    campus: 'Midrand',
    category: 'wifi',
    priority: 'high',
    status: 'open',
    subject: 'No Wi-Fi in Lab 3',
    description: 'Cannot connect to the campus network.',
    location: 'Lab 3',
    assignedTo: null,
    assignedToName: null,
    createdBy: uid,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

async function seedTicket(overrides = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'tickets', 'ticket-1'), ticketFor(STUDENT.sub, overrides));
  });
}

describe('tickets', () => {
  it('lets a student create a ticket under their own uid', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertSucceeds(setDoc(doc(db, 'tickets', 'new-1'), ticketFor(STUDENT.sub)));
  });

  it('stops a student creating a ticket under someone else’s uid', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(doc(db, 'tickets', 'new-2'), ticketFor(OTHER_STUDENT.sub)),
    );
  });

  it('stops a non-institutional account creating a ticket', async () => {
    const db = testEnv.authenticatedContext(OUTSIDER.sub, OUTSIDER).firestore();
    await assertFails(setDoc(doc(db, 'tickets', 'new-3'), ticketFor(OUTSIDER.sub)));
  });

  it('stops a student logging a ticket that is already resolved', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(doc(db, 'tickets', 'new-4'), ticketFor(STUDENT.sub, { status: 'resolved' })),
    );
  });

  it('stops a student assigning a ticket to an agent on creation', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(
        doc(db, 'tickets', 'new-5'),
        ticketFor(STUDENT.sub, { assignedTo: AGENT.sub, assignedToName: 'IT Desk' }),
      ),
    );
  });

  it('lets a student read their own ticket', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertSucceeds(getDoc(doc(db, 'tickets', 'ticket-1')));
  });

  it('stops a student reading another student’s ticket', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(OTHER_STUDENT.sub, OTHER_STUDENT).firestore();
    await assertFails(getDoc(doc(db, 'tickets', 'ticket-1')));
  });

  it('stops a student querying the whole queue the way support does', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(OTHER_STUDENT.sub, OTHER_STUDENT).firestore();
    // This is exactly syncService.pullRemote()'s support-scoped query.
    await assertFails(getDocs(query(collection(db, 'tickets'), where('updatedAt', '>', 0))));
  });

  it('lets support read the whole queue', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(AGENT.sub, AGENT).firestore();
    await assertSucceeds(getDocs(query(collection(db, 'tickets'), where('updatedAt', '>', 0))));
  });

  it('stops a student assigning their own ticket', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      updateDoc(doc(db, 'tickets', 'ticket-1'), {
        assignedTo: STUDENT.sub,
        assignedToName: 'Thandi',
        updatedAt: 1_700_000_001_000,
      }),
    );
  });

  it('lets support assign a ticket', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(AGENT.sub, AGENT).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'tickets', 'ticket-1'), {
        assignedTo: AGENT.sub,
        assignedToName: 'IT Desk',
        status: 'in_progress',
        updatedAt: 1_700_000_001_000,
      }),
    );
  });

  it('lets a student reopen their own resolved ticket', async () => {
    await seedTicket({ status: 'resolved' });
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'tickets', 'ticket-1'), {
        status: 'open',
        updatedAt: 1_700_000_001_000,
      }),
    );
  });

  it('stops anyone rewriting createdBy, reference or createdAt', async () => {
    await seedTicket();
    const student = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    const agent = testEnv.authenticatedContext(AGENT.sub, AGENT).firestore();

    await assertFails(
      updateDoc(doc(student, 'tickets', 'ticket-1'), { createdBy: OTHER_STUDENT.sub }),
    );
    await assertFails(
      updateDoc(doc(agent, 'tickets', 'ticket-1'), { reference: 'EDU-ZZZZZZ' }),
    );
    await assertFails(updateDoc(doc(agent, 'tickets', 'ticket-1'), { createdAt: 0 }));
  });
});

describe('comments', () => {
  const comment = (uid, overrides = {}) => ({
    id: 'comment-1',
    ticketId: 'ticket-1',
    authorId: uid,
    authorName: 'Someone',
    fromSupport: false,
    body: 'Still not working.',
    createdAt: 1_700_000_002_000,
    ...overrides,
  });

  it('lets the ticket owner comment', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'tickets', 'ticket-1', 'comments', 'c1'), comment(STUDENT.sub)),
    );
  });

  it('stops a student posting a comment marked as from support', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(
        doc(db, 'tickets', 'ticket-1', 'comments', 'c2'),
        comment(STUDENT.sub, { fromSupport: true }),
      ),
    );
  });

  it('lets support post a comment marked as from support', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(AGENT.sub, AGENT).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'tickets', 'ticket-1', 'comments', 'c3'),
        comment(AGENT.sub, { fromSupport: true }),
      ),
    );
  });

  it('stops a student commenting on someone else’s ticket', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(OTHER_STUDENT.sub, OTHER_STUDENT).firestore();
    await assertFails(
      setDoc(
        doc(db, 'tickets', 'ticket-1', 'comments', 'c4'),
        comment(OTHER_STUDENT.sub),
      ),
    );
  });

  it('stops anyone posting a comment under another uid', async () => {
    await seedTicket();
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(doc(db, 'tickets', 'ticket-1', 'comments', 'c5'), comment(AGENT.sub)),
    );
  });

  it('keeps comments an audit trail: no edits, no deletes', async () => {
    await seedTicket();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'tickets', 'ticket-1', 'comments', 'c6'),
        comment(STUDENT.sub),
      );
    });

    const db = testEnv.authenticatedContext(AGENT.sub, AGENT).firestore();
    await assertFails(
      updateDoc(doc(db, 'tickets', 'ticket-1', 'comments', 'c6'), { body: 'edited' }),
    );
    await assertFails(deleteDoc(doc(db, 'tickets', 'ticket-1', 'comments', 'c6')));
  });
});

describe('user profiles', () => {
  const profile = (uid, email, overrides = {}) => ({
    uid,
    email,
    displayName: 'Thandi Mokoena',
    studentNumber: 'ST12345',
    campus: 'Midrand',
    providerId: 'password',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  });

  it('lets a student write their own profile', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', STUDENT.sub), profile(STUDENT.sub, STUDENT.email)),
    );
  });

  it('stops a student granting themselves a role', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(
        doc(db, 'users', STUDENT.sub),
        profile(STUDENT.sub, STUDENT.email, { role: 'support' }),
      ),
    );
  });

  it('stops a student writing someone else’s profile', async () => {
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(
      setDoc(doc(db, 'users', OTHER_STUDENT.sub), profile(OTHER_STUDENT.sub, OTHER_STUDENT.email)),
    );
  });

  it('stops a student reading someone else’s profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', OTHER_STUDENT.sub),
        profile(OTHER_STUDENT.sub, OTHER_STUDENT.email),
      );
    });
    const db = testEnv.authenticatedContext(STUDENT.sub, STUDENT).firestore();
    await assertFails(getDoc(doc(db, 'users', OTHER_STUDENT.sub)));
  });

  it('lets support read a student profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', STUDENT.sub),
        profile(STUDENT.sub, STUDENT.email),
      );
    });
    const db = testEnv.authenticatedContext(AGENT.sub, AGENT).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', STUDENT.sub)));
  });

  it('stops a non-institutional account writing a profile', async () => {
    const db = testEnv.authenticatedContext(OUTSIDER.sub, OUTSIDER).firestore();
    await assertFails(
      setDoc(doc(db, 'users', OUTSIDER.sub), profile(OUTSIDER.sub, OUTSIDER.email)),
    );
  });
});
