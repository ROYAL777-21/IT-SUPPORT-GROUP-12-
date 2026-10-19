import { vi } from 'vitest';

const native = vi.hoisted(() => ({
  user: null as any,
  databases: new Map<string, any>(),
  documents: new Map<string, any>(),
  batches: [] as string[][],
  failRead: false,
  failThread: false,
  failWrite: false,
  failWritePath: '',
  failSQL: '',
  beforeCommit: null as null | (() => Promise<void>),
  clock: 1000,
  popup: vi.fn(),
  password: vi.fn(),
  removeUser: vi.fn(),
  signOut: vi.fn(),
}));

export function getNative() { return native; }

vi.mock('expo-crypto', async () => {
  const crypto = await import('node:crypto');
  return { randomUUID: crypto.randomUUID, CryptoDigestAlgorithm: { SHA256: 'sha256' },
    digestStringAsync: async (algorithm: string, value: string) => crypto.createHash(algorithm).update(value).digest('hex') };
});
vi.mock('expo-network', () => ({ getNetworkStateAsync: async () => ({isConnected: true, isInternetReachable: true}) }));

vi.mock('expo-sqlite', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  return { openDatabaseAsync: async (name: string) => {
    if (native.databases.has(name)) return native.databases.get(name);
    const sql = new DatabaseSync(':memory:');
    const adapter = {
      execAsync: async (text: string) => { sql.exec(text); },
      runAsync: async (text: string, values: any[] = []) => {
        if (native.failSQL && text.includes(native.failSQL)) throw new Error('Database write failed');
        return sql.prepare(text).run(...values);
      },
      getFirstAsync: async (text: string, values: any[] = []) => sql.prepare(text).get(...values) ?? null,
      getAllAsync: async (text: string, values: any[] = []) => sql.prepare(text).all(...values),
      withExclusiveTransactionAsync: async (callback: (transaction: any) => Promise<void>) => {
        sql.exec('BEGIN IMMEDIATE');
        try { await callback(adapter); sql.exec('COMMIT'); }
        catch (error) { sql.exec('ROLLBACK'); throw error; }
      },
    };
    native.databases.set(name, adapter);
    return adapter;
  } };
});

vi.mock('@react-native-firebase/app', () => ({ getApps: () => [{}] }));
vi.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: native.user }),
  getIdTokenResult: async (user: any) => ({ claims: { support: user.support === true } }),
  signInWithEmailAndPassword: native.password,
  signInWithPopup: native.popup,
  deleteUser: native.removeUser,
  signOut: native.signOut,
  createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn(), sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(), onIdTokenChanged: vi.fn(), reload: vi.fn(),
  OAuthProvider: class {
    scopes: string[] = []; customParameters = {};
    constructor(public providerId: string) {}
    addScope(value: string) { this.scopes.push(value); }
    setCustomParameters(value: object) { this.customParameters = value; }
  },
}));

vi.mock('@react-native-firebase/firestore', () => {
  const snapshot = (path: string, value: any) => ({ id: path.split('/').at(-1), data: () => value, exists: () => value !== undefined });
  return {
    getFirestore: () => ({}),
    doc: (_db: any, ...parts: string[]) => ({ path: parts.join('/') }),
    collection: (_db: any, ...parts: string[]) => ({ path: parts.join('/') }),
    where: (field: string, op: string, value: any) => ({ field, op, value }),
    orderBy: () => ({}), limit: () => ({}),
    query: (ref: any, ...constraints: any[]) => ({ ...ref, constraints }),
    serverTimestamp: () => ({ toMillis: () => ++native.clock }),
    Timestamp: { fromMillis: (value: number) => ({ toMillis: () => value }) },
    getDocFromServer: async (ref: any) => {
      if (native.failRead) throw new Error('Unavailable');
      return snapshot(ref.path, native.documents.get(ref.path));
    },
    getDocsFromServer: async (ref: any) => {
      if (native.failRead || (native.failThread && ref.path.endsWith('/comments'))) throw new Error('Unavailable');
      return { docs: [...native.documents].filter(([path, data]) => {
        if (path.slice(0, path.lastIndexOf('/')) !== ref.path) return false;
        return (ref.constraints ?? []).every((c: any) => {
          if (!c.field) return true;
          if (c.op === '==') return data[c.field] === c.value;
          return (data[c.field]?.toMillis?.() ?? data[c.field] ?? 0) >= c.value.toMillis();
        });
      }).map(([path, data]) => snapshot(path, data)) };
    },
    setDoc: async (ref: any, data: any) => {
      if (native.failWrite) throw new Error('Unavailable');
      native.documents.set(ref.path, data);
    },
    deleteDoc: async (ref: any) => { if (native.failWrite) throw new Error('Unavailable'); native.documents.delete(ref.path); },
    writeBatch: () => {
      const writes: { ref: any; data: any; update: boolean }[] = [];
      return {
        set: (ref: any, data: any) => writes.push({ ref, data, update: false }),
        update: (ref: any, data: any) => writes.push({ ref, data, update: true }),
        commit: async () => {
          if (native.failWrite) throw new Error('Unavailable');
          if (writes.some((write) => write.ref.path === native.failWritePath)) {
            throw Object.assign(new Error('Permission denied'), {code:'firestore/permission-denied'});
          }
          if (native.beforeCommit) { const action = native.beforeCommit; native.beforeCommit = null; await action(); }
          native.batches.push(writes.map((w) => w.ref.path));
          for (const {ref, data, update} of writes) {
            if (update && !native.documents.has(ref.path)) throw new Error('Document not found');
            native.documents.set(ref.path, {...native.documents.get(ref.path), ...data});
          }
        },
      };
    },
    onSnapshot: () => () => {},
  };
});
