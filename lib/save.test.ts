import { describe, expect, it } from "vitest";
import { newGame } from "./game";
import { DEFAULT_SETTINGS, EMPTY_SAVE, parseSave, RECENT_LIMIT } from "./save";
import { EMPTY_STATS, recordResult } from "./stats";

describe("parseSave", () => {
  it("round-trips a real save", () => {
    const save = {
      settings: { mode: "unlimited", hard: true, theme: "dark", contrast: true },
      games: { "en-daily": { ...newGame("crane", 4), guesses: ["slate"] }, "da-unlimited": newGame("kaffe", null) },
      stats: { "en-daily": recordResult(EMPTY_STATS, { won: true, tries: 3, day: 3 }) },
      recent: { da: ["kaffe", "skole"] },
    };
    expect(parseSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it("falls back to an empty save for anything that isn't one", () => {
    expect(parseSave(null)).toEqual(EMPTY_SAVE);
    expect(parseSave("nope")).toEqual(EMPTY_SAVE);
    expect(parseSave([1, 2])).toEqual(EMPTY_SAVE);
  });

  it("drops games that couldn't have come from the game", () => {
    const save = parseSave({
      games: {
        "en-daily": { solution: "CRANES", guesses: [], hard: false, day: 1 },
        "en-unlimited": { solution: "crane", guesses: ["slate"], hard: false, day: 3 },
        "da-daily": { solution: "kaffe", guesses: Array(7).fill("skole"), hard: false, day: 1 },
        "da-unlimited": { solution: "kaffe", guesses: ["sk0le"], hard: false, day: null },
        "xx-daily": newGame("crane", 1),
      },
    });
    expect(save.games).toEqual({});
  });

  it("only takes Danish letters in Danish games", () => {
    expect(parseSave({ games: { "en-unlimited": newGame("æbler", null) } }).games).toEqual({});
    expect(parseSave({ games: { "da-unlimited": newGame("æbler", null) } }).games).toEqual({ "da-unlimited": newGame("æbler", null) });
  });

  it("repairs settings and statistics field by field", () => {
    const save = parseSave({
      settings: { mode: "weekly", hard: "yes", theme: "blue", contrast: true },
      stats: { "en-daily": { ...EMPTY_STATS, played: 2, guesses: [1, 2] }, "da-daily": { played: -1 } },
    });
    expect(save.settings).toEqual({ ...DEFAULT_SETTINGS, contrast: true });
    expect(save.stats["en-daily"]).toEqual({ ...EMPTY_STATS, played: 2 });
    expect(save.stats["da-daily"]).toBeUndefined();
  });

  it("keeps only the latest recent answers", () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) => (i % 2 ? "crane" : "slate"));
    expect(parseSave({ recent: { en: many } }).recent.en).toHaveLength(RECENT_LIMIT);
  });
});
