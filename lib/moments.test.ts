import { describe, expect, it } from "vitest";
import { newGame } from "./game";
import { moment, pick } from "./moments";

const game = (solution: string, guesses: string[]) => ({ ...newGame(solution, null), guesses });

describe("moment", () => {
  it("has nothing to say before a guess or about an ordinary one", () => {
    expect(moment(game("crane", []))).toBeNull();
    expect(moment(game("crane", ["slate"]))).toBeNull();
    expect(moment(game("crane", ["pious", "slate"]))).toBeNull();
  });

  it("knows a win and how many tries it took", () => {
    expect(moment(game("crane", ["crane"]))).toEqual({ kind: "won", tries: 1 });
    expect(moment(game("crane", [...Array(5).fill("slate"), "crane"]))).toEqual({ kind: "won", tries: 6 });
  });

  it("notices a first guess that hit nothing, but only the first", () => {
    expect(moment(game("crane", ["pilot"]))).toEqual({ kind: "blank" });
    expect(moment(game("crane", ["slate", "pilot"]))).toBeNull();
  });

  it("tells a loss by one letter from any other loss", () => {
    expect(moment(game("crane", [...Array(5).fill("slate"), "crate"]))).toEqual({ kind: "lost", close: true });
    expect(moment(game("crane", Array(6).fill("slate")))).toEqual({ kind: "lost", close: false });
    // Four letters of the word, but not four in place
    expect(moment(game("crane", [...Array(5).fill("slate"), "nacre"]))).toEqual({ kind: "lost", close: false });
  });
});

describe("pick", () => {
  it("takes any of the lines, and none from an empty pool", () => {
    expect(pick(["a", "b", "c"], () => 0)).toBe("a");
    expect(pick(["a", "b", "c"], () => 0.5)).toBe("b");
    expect(pick(["a", "b", "c"], () => 0.999)).toBe("c");
    expect(pick(["a", "b", "c"], () => 1)).toBe("c");
    expect(pick([])).toBeUndefined();
  });
});
