import { randomUUID } from 'expo-crypto';

/** Random UUID backed by the operating system's cryptographic generator. */
export function uuid(): string {
  return randomUUID();
}
