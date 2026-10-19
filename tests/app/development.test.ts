import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNative } from '../support/native';
import { activateDatabase, deactivateDatabase, getDatabase, getSyncMeta } from '@/db/database';
import { isInstitutionalEmail, signIn, signInWithMicrosoft, logOut } from '@/services/authService';
import { ensureUserProfile, updateProfileDetails, deleteProfileDetails, getLocalProfile } from '@/services/profileService';
import { addComment, assignTicket, countPending, createTicket, deleteTicket, getTicket, listComments, listTicketsFor, updateTicketDetails, updateTicketStatus } from '@/services/ticketRepository';
import { sync } from '@/services/syncService';
import { generateReference, type NewTicketInput } from '@/models/ticket';
import { uuid } from '@/utils/id';
import { openDatabaseAsync } from 'expo-sqlite';
import { MIGRATIONS } from '@/db/schema';

const native = getNative();

const input: NewTicketInput = {
  studentNumber:'ST12345', campus:'Midrand', category:'wifi', priority:'medium',
  subject:'Cannot connect to Wi-Fi', description:'The connection fails in the library.',
};
function user(uid = 'student-1', support = false) {
  return { uid, email: `${uid}@eduvos.ac.za`, emailVerified:true, displayName:'Test Student',
    providerData:[{providerId:'password'}], support };
}
async function login(uid = 'student-1', support = false) {
  native.user = user(uid, support);
  await activateDatabase(uid);
}
beforeEach(async () => {
  deactivateDatabase(); native.databases.clear(); native.documents.clear(); native.batches.length = 0;
  native.failRead = false; native.failThread = false; native.failWrite = false; native.failSQL = '';
  native.beforeCommit = null; native.clock = 1000;
  native.failWritePath = '';
  vi.clearAllMocks();
  native.signOut.mockImplementation(async () => { native.user = null; });
  native.removeUser.mockResolvedValue(undefined);
  await login();
});

describe('identity and native authentication', () => {
  it.each([' student@eduvos.ac.za ', 'STAFF@EDUVOS.COM'])('accepts the institutional address %s', (email) => {
    expect(isInstitutionalEmail(email)).toBe(true);
  });
  it.each(['a@eduvos.com@evil.test','a@eduvos.com.evil.test','@eduvos.com','a b@eduvos.com','a@outlook.com'])('rejects %s', (email) => {
    expect(isInstitutionalEmail(email)).toBe(false);
  });
  it('rejects outsiders before sending a password to Firebase', async () => {
    await expect(signIn('a@outlook.com','password')).rejects.toThrow('Eduvos');
    expect(native.password).not.toHaveBeenCalled();
  });
  it('uses the native Microsoft provider with the expected scopes', async () => {
    native.popup.mockResolvedValue({user:native.user});
    await signInWithMicrosoft();
    const provider = native.popup.mock.calls[0][1];
    expect(provider.providerId).toBe('microsoft.com');
    expect(provider.scopes).toEqual(expect.arrayContaining(['openid','profile','email','offline_access','User.Read']));
    expect(provider.customParameters.prompt).toBe('select_account');
  });
  it('signs a rejected Microsoft account out even if deleting it fails', async () => {
    native.popup.mockResolvedValue({user:{...native.user,email:'guest@outlook.com'},additionalUserInfo:{isNewUser:true}});
    native.removeUser.mockRejectedValue(new Error('Deletion failed'));
    await expect(signInWithMicrosoft()).rejects.toThrow('not an Eduvos account');
    expect(native.signOut).toHaveBeenCalledOnce();
    expect(native.user).toBeNull();
  });
  it('returns actionable feedback for a disabled Microsoft provider', async () => {
    native.popup.mockRejectedValue({code:'auth/operation-not-allowed'});
    await expect(signInWithMicrosoft()).rejects.toThrow('not available yet');
  });
  it('generates UUIDs and references from the cryptographic generator', () => {
    const forbidden = vi.spyOn(Math,'random').mockImplementation(() => { throw new Error('Insecure randomness'); });
    try {
      const ids = new Set(Array.from({length:1000},uuid));
      expect(ids.size).toBe(1000);
      expect([...ids][0]).toMatch(/^[a-f0-9-]{14}4[a-f0-9-]+$/);
      expect(generateReference()).toMatch(/^EDU-[A-F0-9]{16}$/);
    } finally { forbidden.mockRestore(); }
  });
});

describe('account isolation and profile persistence', () => {
  async function legacyCache() {
    const db = await openDatabaseAsync('campus-it-help.db');
    for (const migration of MIGRATIONS.filter((entry) => entry.version <= 2)) {
      for (const statement of migration.statements) await db.execAsync(statement);
    }
    await db.execAsync('PRAGMA user_version = 2;');
    await db.runAsync(`INSERT INTO user_profiles (uid,email,display_name,student_number,campus,role,provider_id,created_at,updated_at)
      VALUES (?,?,'Student','ST12345','Midrand','student','password',1,1);`, ['student-1','student-1@eduvos.ac.za']);
    await db.runAsync(`INSERT INTO tickets (id,reference,student_number,campus,category,priority,status,subject,description,created_by,created_at,updated_at)
      VALUES ('legacy-ticket','EDU-LEGACY','ST12345','Midrand','wifi','medium','open','Saved offline ticket','Cannot connect','student-1',1,1);`);
    return db;
  }
  it('migrates an older account cache and uploads its unsent ticket once', async () => {
    const legacy = await legacyCache();
    deactivateDatabase();
    await login();
    expect((await getTicket('legacy-ticket'))?.subject).toBe('Saved offline ticket');
    expect((await getLocalProfile('student-1'))?.campus).toBe('Midrand');
    await sync('student-1');
    expect(native.documents.get('tickets/legacy-ticket').subject).toBe('Saved offline ticket');
    await legacy.runAsync("UPDATE tickets SET subject = 'Stale old cache';");
    deactivateDatabase();
    await login();
    expect((await getTicket('legacy-ticket'))?.subject).toBe('Saved offline ticket');
  });
  it('does not import a legacy cache into another account', async () => {
    await legacyCache();
    await login('student-2');
    await expect(getLocalProfile('student-1')).rejects.toThrow('Sign in');
    expect(await (await getDatabase()).getAllAsync('SELECT * FROM user_profiles;')).toEqual([]);
    expect(await listTicketsFor('student-2')).toEqual([]);
    expect(await getSyncMeta('legacyImported')).toBeNull();
  });
  it('preserves deletion of an already uploaded legacy ticket', async () => {
    const legacy = await legacyCache();
    await legacy.runAsync('UPDATE tickets SET deleted = 1;');
    native.documents.set('tickets/legacy-ticket', { ...input, id:'legacy-ticket',reference:'EDU-LEGACY',
      status:'open',createdBy:'student-1',createdAt:1,updatedAt:1,assignedTo:null,assignedToName:null });
    deactivateDatabase();
    await login();
    await sync('student-1');
    expect(native.documents.get('tickets/legacy-ticket').deleted).toBe(true);
    expect(await getTicket('legacy-ticket')).toBeNull();
  });
  it('keeps unsent work across sign-out and hides it from another account', async () => {
    const ticket = await createTicket(input, native.user.uid);
    await logOut();
    await expect(getDatabase()).rejects.toThrow('Sign in');
    await login('student-2');
    expect(await listTicketsFor('student-2')).toEqual([]);
    expect(await getTicket(ticket.id)).toBeNull();
    await login('student-1');
    expect(await listTicketsFor('student-1')).toHaveLength(1);
    expect(await countPending()).toBe(1);
  });
  it('queues profile writes, sends null optional values, and retries failures', async () => {
    native.user.support = true;
    await ensureUserProfile(native.user,'support');
    await updateProfileDetails(native.user.uid,{displayName:'IT Desk'});
    native.failWrite = true;
    await expect(sync(native.user.uid,'support')).rejects.toThrow('Unavailable');
    expect(await countPending()).toBe(1);
    native.failWrite = false;
    await sync(native.user.uid,'support');
    expect(native.documents.get('users/student-1')).toMatchObject({displayName:'IT Desk',studentNumber:null,campus:null});
    expect(await countPending()).toBe(0);
    expect(native.documents.get('users/student-1')).not.toHaveProperty('role');
  });
  it('does not replace an edited name with the stale authentication display name', async () => {
    await ensureUserProfile(native.user,'student');
    await updateProfileDetails(native.user.uid,{displayName:'Updated Name',studentNumber:input.studentNumber,campus:input.campus});
    expect((await ensureUserProfile(native.user,'student')).displayName).toBe('Updated Name');
  });
  it('does not create an empty replacement when the first remote profile read fails', async () => {
    native.failRead = true;
    await expect(ensureUserProfile(native.user,'student')).rejects.toThrow('Connect to the internet');
    expect(await getLocalProfile(native.user.uid)).toBeNull();
    expect(await countPending()).toBe(0);
  });
  it('deletes profile details without deleting the account or tickets', async () => {
    await ensureUserProfile(native.user,'student');
    await updateProfileDetails(native.user.uid,{displayName:'Student',studentNumber:input.studentNumber,campus:input.campus});
    const ticket = await createTicket(input,native.user.uid);
    await sync(native.user.uid);
    await deleteProfileDetails(native.user.uid);
    await sync(native.user.uid);
    expect(native.documents.has('users/student-1')).toBe(false);
    expect((await getLocalProfile('student-1'))?.displayName).toBe('');
    expect(await getTicket(ticket.id)).not.toBeNull();
    expect(native.user.uid).toBe('student-1');
  });
});

describe('tickets and synchronization', () => {
  it('creates, reads, updates and deletes a real SQLite ticket', async () => {
    const ticket = await createTicket(input,native.user.uid);
    expect((await getTicket(ticket.id))?.subject).toBe(input.subject);
    await updateTicketDetails(ticket.id,{...input,subject:'Updated Wi-Fi issue'});
    expect((await getTicket(ticket.id))?.subject).toBe('Updated Wi-Fi issue');
    await deleteTicket(ticket.id);
    expect(await getTicket(ticket.id)).toBeNull();
    await sync(native.user.uid);
    expect(native.documents.get(`tickets/${ticket.id}`).deleted).toBe(true);
  });
  it('rejects invalid data before it enters the offline queue', async () => {
    await expect(createTicket({...input,subject:'x'},native.user.uid)).rejects.toThrow('title');
    await expect(createTicket({...input,studentNumber:''},native.user.uid)).rejects.toThrow('student number');
    expect(await countPending()).toBe(0);
  });
  it('prevents students assigning tickets or marking them resolved', async () => {
    const ticket = await createTicket(input,native.user.uid);
    await expect(assignTicket(ticket.id,{id:native.user.uid,name:'Student'})).rejects.toThrow('Only support');
    await expect(updateTicketStatus(ticket.id,'resolved')).rejects.toThrow('not allowed');
  });
  it('supports the support lifecycle and student confirmation', async () => {
    const ticket = await createTicket(input,native.user.uid);
    native.user.support = true;
    await assignTicket(ticket.id,{id:native.user.uid,name:'IT Desk'});
    expect((await getTicket(ticket.id))?.status).toBe('in_progress');
    await updateTicketStatus(ticket.id,'resolved');
    native.user.support = false;
    await updateTicketStatus(ticket.id,'closed');
    await expect(addComment(ticket.id,'Reply',{id:native.user.uid,name:'Student'})).rejects.toThrow('Reopen');
    await updateTicketStatus(ticket.id,'open');
    await addComment(ticket.id,'It still fails',{id:native.user.uid,name:'Student'});
    expect(await listComments(ticket.id)).toHaveLength(1);
  });
  it('rolls back a reply if the parent notification cannot be written', async () => {
    const ticket = await createTicket(input,native.user.uid);
    native.failSQL = 'UPDATE tickets';
    await expect(addComment(ticket.id,'A reply',{id:native.user.uid,name:'Student'})).rejects.toThrow('Database write failed');
    native.failSQL = '';
    expect(await listComments(ticket.id)).toEqual([]);
  });
  it('publishes the reply and its parent notification in one batch', async () => {
    const ticket = await createTicket(input,native.user.uid);
    const comment = await addComment(ticket.id,'Still disconnected',{id:native.user.uid,name:'Student'});
    await sync(native.user.uid);
    expect(native.batches[0]).toEqual([`tickets/${ticket.id}`,`tickets/${ticket.id}/comments/${comment.id}`]);
    expect(await countPending()).toBe(0);
  });
  it('preserves server assignment and status when a student sends a reply from stale cache', async () => {
    const ticket = await createTicket(input,native.user.uid);
    await sync(native.user.uid);
    Object.assign(native.documents.get(`tickets/${ticket.id}`),{status:'in_progress',assignedTo:'support-1',assignedToName:'IT Desk'});
    await addComment(ticket.id,'Any update?',{id:native.user.uid,name:'Student'});
    await sync(native.user.uid);
    expect((await getTicket(ticket.id))?.status).toBe('in_progress');
    expect((await getTicket(ticket.id))?.assignedTo).toBe('support-1');
  });
  it('splits large reply queues without overwriting server changes between chunks', async () => {
    const ticket = await createTicket(input,native.user.uid);
    for (let index = 0; index < 401; index++) {
      await addComment(ticket.id,`Queued reply ${index}`,{id:native.user.uid,name:'Student'});
    }
    native.beforeCommit = async () => {
      native.beforeCommit = async () => {
        Object.assign(native.documents.get(`tickets/${ticket.id}`),{status:'in_progress',assignedTo:'support-1',assignedToName:'IT Desk'});
      };
    };
    await sync(native.user.uid);
    expect(native.batches.map((batch) => batch.length)).toEqual([401,2]);
    expect((await getTicket(ticket.id))?.assignedTo).toBe('support-1');
    expect(await countPending()).toBe(0);
  });
  it('keeps edits pending when a write finishes during another local edit', async () => {
    const ticket = await createTicket(input,native.user.uid);
    native.beforeCommit = () => updateTicketDetails(ticket.id,{...input,subject:'Edited during upload'});
    await sync(native.user.uid);
    expect(await countPending()).toBe(1);
    await sync(native.user.uid);
    expect(native.documents.get(`tickets/${ticket.id}`).subject).toBe('Edited during upload');
    expect(await countPending()).toBe(0);
  });
  it('retries a committed creation without overwriting subsequent support changes', async () => {
    const ticket = await createTicket(input,native.user.uid);
    native.failSQL = 'UPDATE tickets SET remote_exists';
    await expect(sync(native.user.uid)).rejects.toThrow('Database write failed');
    native.failSQL = '';
    Object.assign(native.documents.get(`tickets/${ticket.id}`), {status:'in_progress',assignedTo:'agent-1',assignedToName:'IT Desk'});
    await sync(native.user.uid);
    expect(await countPending()).toBe(0);
    expect((await getTicket(ticket.id))?.assignedTo).toBe('agent-1');
    expect((await getTicket(ticket.id))?.status).toBe('in_progress');
  });
  it('does not advance the cursor when a comment read fails', async () => {
    const ticket = await createTicket(input,native.user.uid);
    await addComment(ticket.id,'A reply',{id:native.user.uid,name:'Student'});
    native.failThread = true;
    await expect(sync(native.user.uid)).rejects.toThrow('Unavailable');
    expect(await getSyncMeta('serverPull:student')).toBeNull();
    native.failThread = false;
    expect((await sync(native.user.uid)).comments).toBe(1);
    expect(await getSyncMeta('serverPull:student')).not.toBeNull();
  });
  it('syncs other tickets and receives changed server status after a rejected reply', async () => {
    const ticket = await createTicket(input,native.user.uid);
    await sync(native.user.uid);
    await addComment(ticket.id,'Any update?',{id:native.user.uid,name:'Student'});
    const other = await createTicket({...input,subject:'Another connection issue'},native.user.uid);
    Object.assign(native.documents.get(`tickets/${ticket.id}`),{
      status:'closed', serverUpdatedAt:{toMillis:()=>10000},
    });
    native.failWritePath = `tickets/${ticket.id}`;
    await expect(sync(native.user.uid)).rejects.toThrow('Permission denied');
    expect(native.documents.has(`tickets/${other.id}`)).toBe(true);
    expect((await getTicket(ticket.id))?.status).toBe('closed');
    expect(await listComments(ticket.id)).toHaveLength(1);
    await updateTicketStatus(ticket.id,'open');
    native.failWritePath = '';
    await sync(native.user.uid);
    expect(await countPending()).toBe(0);
  });
  it('includes new records tied with the previous server timestamp', async () => {
    const ticket = await createTicket(input,native.user.uid);
    await sync(native.user.uid);
    const remote = native.documents.get(`tickets/${ticket.id}`);
    const sameTimestamp = await getSyncMeta('serverPull:student');
    native.documents.set('tickets/another-ticket',{...remote,id:'another-ticket',serverUpdatedAt:{toMillis:()=>Number(sameTimestamp)}});
    await sync(native.user.uid);
    expect(await listTicketsFor(native.user.uid)).toHaveLength(2);
  });
  it('does not write an old account sync into a newly active account cache', async () => {
    await createTicket(input,native.user.uid);
    native.beforeCommit = () => login('student-2');
    await expect(sync('student-1')).rejects.toThrow('session changed');
    expect(await listTicketsFor('student-2')).toEqual([]);
  });
  it('does not upload unverified accounts', async () => {
    native.user.emailVerified = false;
    expect((await sync(native.user.uid)).skipped).toBe('unverified');
    expect(native.documents.size).toBe(0);
  });
});
