import { MAX_GUESSES } from "./words";

export type Stats = {
  played: number;
  wins: number;
  /** Wins in a row (daily: on consecutive days) */
  streak: number;
  best: number;
  /** Wins by number of guesses, index 0 = solved in one */
  guesses: number[];
  /** The last daily puzzle counted, so a day is counted once and a missed day ends the streak */
  lastDay: number | null;
};

export const EMPTY_STATS: Stats = { played: 0, wins: 0, streak: 0, best: 0, guesses: Array<number>(MAX_GUESSES).fill(0), lastDay: null };

export function recordResult(stats: Stats, { won, tries, day }: { won: boolean; tries: number; day: number | null }): Stats {
  if (day !== null && stats.lastDay !== null && day <= stats.lastDay) return stats;
  const keepsStreak = day === null || stats.lastDay === day - 1;
  const streak = won ? (keepsStreak ? stats.streak : 0) + 1 : 0;
  const guesses = [...stats.guesses];
  if (won) guesses[tries - 1] = (guesses[tries - 1] ?? 0) + 1;
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    streak,
    best: Math.max(stats.best, streak),
    guesses,
    lastDay: day ?? stats.lastDay,
  };
}

/** The streak as it stands today: a daily streak is over once a day has been skipped */
export function currentStreak(stats: Stats, today: number | null): number {
  if (today === null) return stats.streak;
  return stats.lastDay !== null && today - stats.lastDay <= 1 ? stats.streak : 0;
}

export function winRate(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}
