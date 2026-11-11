import { evaluate, status, type Game } from "./game";
import { WORD_LENGTH } from "./words";

/**
 * What the latest guess calls for a word about: a win, a loss (close when only one letter was
 * out of place), or a first guess that hit nothing at all. The words themselves are in data/ui.ts.
 */
export type Moment = { kind: "won"; tries: number } | { kind: "lost"; close: boolean } | { kind: "blank" };

export function moment(game: Game): Moment | null {
  const last = game.guesses.at(-1);
  if (last === undefined) return null;
  const state = status(game);
  if (state === "won") return { kind: "won", tries: game.guesses.length };
  const marks = evaluate(last, game.solution);
  if (state === "lost") return { kind: "lost", close: marks.filter((mark) => mark === "correct").length === WORD_LENGTH - 1 };
  return game.guesses.length === 1 && marks.every((mark) => mark === "absent") ? { kind: "blank" } : null;
}

/** One of a handful of lines, so the game doesn't say the same thing every time */
export function pick<T>(pool: readonly T[], random: () => number = Math.random): T | undefined {
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
