/**
 * RFC 4122 v4 identifier.
 *
 * Backed by Math.random rather than a CSPRNG, which is fine here: these ids
 * are database keys, never secrets or capabilities. Anything security-bearing
 * must come from Firebase Auth instead. Swap in expo-crypto's randomUUID if a
 * cryptographically strong source is ever needed.
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
