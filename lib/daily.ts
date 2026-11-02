/**
 * The daily word follows the player's own calendar: a new one at local midnight,
 * the same for everyone on the same date. Dates travel as "YYYY-MM-DD" keys.
 */

const DAY_MS = 86_400_000;

/** Puzzle #1 was played on this date */
export const FIRST_DAY = "2026-11-02";

/** The local date as a key */
export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Midnight UTC of a date key, or null if the key isn't a real date */
export function parseDateKey(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? ms : null;
}

const FIRST_MS = parseDateKey(FIRST_DAY)!;

/** The puzzle number for a date key (#1 on FIRST_DAY) */
export function dayNumber(key: string): number {
  const ms = parseDateKey(key);
  if (ms === null) throw new Error(`Not a date: ${key}`);
  return Math.round((ms - FIRST_MS) / DAY_MS) + 1;
}

/** The day's answer. Puzzles before #1 (a wrong clock) still get a word. */
export function dailyAnswer(answers: readonly string[], day: number): string {
  const n = answers.length;
  return answers[((day % n) + n) % n]!;
}

/**
 * Somewhere on Earth it's already tomorrow (UTC+14) or still yesterday (UTC-12),
 * so a player's date is at most one day from the server's UTC date. Anything
 * further out would only be peeking at future words.
 */
export function isNearToday(key: string, now: number): boolean {
  const ms = parseDateKey(key);
  if (ms === null) return false;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return Math.abs(ms - today) <= DAY_MS;
}

/** Milliseconds until the next local midnight */
export function msUntilMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
