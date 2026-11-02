import { MAX_GUESSES, WORD_LENGTH } from "./words";

export type Mark = "correct" | "present" | "absent";
export type Status = "playing" | "won" | "lost";

export type Game = {
  solution: string;
  guesses: string[];
  /** Hard mode was on from the first guess and never switched off (it can't be switched on mid-game) */
  hard: boolean;
  /** The daily puzzle's number, or null in Unlimited */
  day: number | null;
};

export type Problem =
  | { kind: "short" }
  | { kind: "unknown" }
  | { kind: "position"; index: number; letter: string }
  | { kind: "missing"; letter: string };

/**
 * Greens first, then yellows from the letters left over, so a letter is only
 * marked as many times as the answer has it: guessing "speed" for "abide"
 * gives one yellow e and one gray.
 */
export function evaluate(guess: string, solution: string): Mark[] {
  const g = [...guess];
  const s = [...solution];
  const marks: Mark[] = g.map(() => "absent");
  const left = new Map<string, number>();
  s.forEach((letter, i) => {
    if (g[i] === letter) marks[i] = "correct";
    else left.set(letter, (left.get(letter) ?? 0) + 1);
  });
  g.forEach((letter, i) => {
    const n = left.get(letter) ?? 0;
    if (marks[i] !== "correct" && n > 0) {
      marks[i] = "present";
      left.set(letter, n - 1);
    }
  });
  return marks;
}

export function status(game: Game): Status {
  if (game.guesses.at(-1) === game.solution) return "won";
  return game.guesses.length >= MAX_GUESSES ? "lost" : "playing";
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

/** The keyboard's colors: the best each letter has done in any guess */
export function letterMarks(guesses: readonly string[], solution: string): Map<string, Mark> {
  const out = new Map<string, Mark>();
  for (const guess of guesses) {
    const letters = [...guess];
    evaluate(guess, solution).forEach((mark, i) => {
      const letter = letters[i]!;
      const prev = out.get(letter);
      if (!prev || RANK[mark] > RANK[prev]) out.set(letter, mark);
    });
  }
  return out;
}

/** Hard mode: greens stay where they are, and every revealed letter is used again (as often as it was revealed) */
export function hardModeProblem(guess: string, guesses: readonly string[], solution: string): Problem | null {
  const g = [...guess];
  const revealed = guesses.map((prev) => ({ letters: [...prev], marks: evaluate(prev, solution) }));
  for (const { letters, marks } of revealed) {
    const i = marks.findIndex((mark, j) => mark === "correct" && g[j] !== letters[j]);
    if (i >= 0) return { kind: "position", index: i, letter: letters[i]! };
  }
  for (const { letters, marks } of revealed) {
    const need = new Map<string, number>();
    letters.forEach((letter, i) => {
      if (marks[i] !== "absent") need.set(letter, (need.get(letter) ?? 0) + 1);
    });
    for (const [letter, n] of need) {
      if (g.filter((l) => l === letter).length < n) return { kind: "missing", letter };
    }
  }
  return null;
}

/** Why a guess can't be played, or null if it can. The answer always counts as a word, even if a list lacks it. */
export function guessProblem(guess: string, game: Game, accepted: ReadonlySet<string>): Problem | null {
  if ([...guess].length < WORD_LENGTH) return { kind: "short" };
  if (guess !== game.solution && !accepted.has(guess)) return { kind: "unknown" };
  return game.hard ? hardModeProblem(guess, game.guesses, game.solution) : null;
}

export function newGame(solution: string, day: number | null): Game {
  return { solution, guesses: [], hard: false, day };
}

/** The game after a guess. The first guess fixes hard mode; switching it off later ends it for this game. */
export function addGuess(game: Game, guess: string, hard: boolean): Game {
  return { ...game, guesses: [...game.guesses, guess], hard: game.guesses.length === 0 ? hard : game.hard && hard };
}
