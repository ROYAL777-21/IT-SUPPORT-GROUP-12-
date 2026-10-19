import { getFirebaseAuth, isFirebaseConfigured } from '@/config/firebase';

/** Check again before remote operations after an asynchronous account change. */
export function requireSession(userId: string): void {
  if (!isFirebaseConfigured || getFirebaseAuth().currentUser?.uid !== userId) {
    throw new Error('Your session changed. Sign in again to continue.');
  }
}
