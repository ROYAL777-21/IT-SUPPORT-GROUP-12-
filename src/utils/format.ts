/** Display helpers. Kept out of components so the wording is consistent. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now" / "3h ago" / "12 Aug". Deliberately coarse — a ticket queue does
 * not benefit from second-level precision, and coarse labels stay correct
 * longer without re-rendering.
 */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = now - timestamp;

  if (elapsed < 0) {
    return 'just now'; // clock skew between devices
  }
  if (elapsed < MINUTE) {
    return 'just now';
  }
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `${minutes}m ago`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours}h ago`;
  }
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY);
    return days === 1 ? 'yesterday' : `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

/** "12 Aug 2026, 14:32" — for the detail screen, where precision is useful. */
export function fullTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
