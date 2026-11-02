import { describe, expect, it } from "vitest";
import { addGuess, evaluate, guessProblem, hardModeProblem, letterMarks, newGame, status, type Game } from "./game";

const words = new Set(["crane", "slate", "speed", "abide", "eerie", "geese", "lever", "level", "rebel", "kaffe", "skole", "æbler"]);

describe("evaluate", () => {
  it("marks greens, yellows and grays", () => {
    expect(evaluate("crane", "react")).toEqual(["present", "present", "correct", "absent", "present"]);
    expect(evaluate("slate", "slate")).toEqual(Array(5).fill("correct"));
  });

  it("marks a repeated letter only as often as the answer has it", () => {
    // one e in abide: the first e in speed is yellow, the second gray
    expect(evaluate("speed", "abide")).toEqual(["absent", "absent", "present", "absent", "present"]);
    // a green e uses up the answer's only e before any yellow is handed out
    expect(evaluate("eerie", "crane")).toEqual(["absent", "absent", "present", "absent", "correct"]);
  });

  it("hands out yellows from what the greens leave", () => {
    // lever has two e's, both green in level; the second l has no l left
    expect(evaluate("level", "lever")).toEqual(["correct", "correct", "correct", "correct", "absent"]);
    // eerie has three e's: two are green in geese, so only one more e can be yellow
    expect(evaluate("geese", "eerie")).toEqual(["absent", "correct", "present", "absent", "correct"]);
  });

  it("handles the Danish letters", () => {
    expect(evaluate("æbler", "kaffe")).toEqual(["absent", "absent", "absent", "present", "absent"]);
  });
});

describe("status", () => {
  it("is won after the answer, lost after six misses, and playing otherwise", () => {
    const game = newGame("crane", 1);
    expect(status(game)).toBe("playing");
    expect(status({ ...game, guesses: ["slate", "crane"] })).toBe("won");
    expect(status({ ...game, guesses: Array(6).fill("slate") })).toBe("lost");
    expect(status({ ...game, guesses: [...Array(5).fill("slate"), "crane"] })).toBe("won");
  });
});

describe("letterMarks", () => {
  it("keeps each letter's best result", () => {
    const marks = letterMarks(["slate", "crane"], "react");
    expect(marks.get("a")).toBe("correct");
    expect(marks.get("t")).toBe("present");
    expect(marks.get("s")).toBe("absent");
    expect(marks.get("z")).toBeUndefined();
  });

  it("doesn't let a gray copy hide a yellow one", () => {
    expect(letterMarks(["speed"], "abide").get("e")).toBe("present");
  });
});

describe("hard mode", () => {
  it("keeps greens in place", () => {
    expect(hardModeProblem("slate", ["crane"], "trace")).toEqual({ kind: "position", index: 1, letter: "r" });
  });

  it("reports the first green that moved", () => {
    expect(hardModeProblem("tepid", ["rebel"], "lever")).toEqual({ kind: "position", index: 3, letter: "e" });
    expect(hardModeProblem("hello", ["crane"], "react")).toEqual({ kind: "position", index: 2, letter: "a" });
  });

  it("requires revealed letters, as often as they were revealed", () => {
    // crane against react: c, r and e are yellow
    expect(hardModeProblem("blank", ["crane"], "react")).toEqual({ kind: "missing", letter: "c" });
    expect(hardModeProblem("trace", ["crane"], "react")).toBeNull();
    // eerie against lever reveals two e's (one green, one yellow) and an r
    expect(hardModeProblem("berry", ["eerie"], "lever")).toEqual({ kind: "missing", letter: "e" });
    expect(hardModeProblem("never", ["eerie"], "lever")).toBeNull();
  });

  it("checks every earlier guess, not just the last", () => {
    // tacit uses everything tasty revealed, but not crane's green a
    expect(hardModeProblem("tacit", ["tasty"], "react")).toBeNull();
    expect(hardModeProblem("tacit", ["crane", "tasty"], "react")).toEqual({ kind: "position", index: 2, letter: "a" });
  });
});

describe("guessProblem", () => {
  const game: Game = newGame("crane", 1);

  it("rejects short words and words outside the list", () => {
    expect(guessProblem("cran", game, words)).toEqual({ kind: "short" });
    expect(guessProblem("xxxxx", game, words)).toEqual({ kind: "unknown" });
    expect(guessProblem("slate", game, words)).toBeNull();
  });

  it("always accepts the answer, even when the list lacks it", () => {
    expect(guessProblem("tacos", newGame("tacos", 1), words)).toBeNull();
  });

  it("applies hard mode only to games that are in it", () => {
    const played = { ...game, guesses: ["slate"] };
    expect(guessProblem("speed", played, words)).toBeNull();
    expect(guessProblem("speed", { ...played, hard: true }, words)).toEqual({ kind: "position", index: 2, letter: "a" });
  });
});

describe("addGuess", () => {
  it("fixes hard mode at the first guess and drops it for good when switched off", () => {
    const first = addGuess(newGame("crane", 1), "slate", true);
    expect(first.hard).toBe(true);
    expect(addGuess(first, "trace", true).hard).toBe(true);
    const off = addGuess(first, "trace", false);
    expect(off.hard).toBe(false);
    expect(addGuess(off, "crane", true).hard).toBe(false);
  });
});
