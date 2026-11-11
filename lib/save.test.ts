import { describe, expect, it } from "vitest";
import { encodeChallenge } from "./challenge";
import { addHint, newGame } from "./game";
import { DEFAULT_SETTINGS, EMPTY_SAVE, parseSave, RECENT_LIMIT } from "./save";
import { EMPTY_STATS, recordResult } from "./stats";

describe("parseSave", () => {
  it("round-trips a real save", () => {
    const save = {
      settings: { mode: "unlimited", mix: true, hard: true, theme: "dark", contrast: true },
      games: {
        "en-daily": { ...newGame("crane", 4), guesses: ["slate"] },
        "da-unlimited": addHint(newGame("kaffe", null)),
        "mix-daily": newGame("fløde", 4),
        "mix-unlimited": { ...newGame("crane", null), guesses: ["bølge"] },
      },
      stats: { "en-daily": recordResult(EMPTY_STATS, { won: true, tries: 3, day: 3 }), "mix-unlimited": recordResult(EMPTY_STATS, { won: false, tries: 6, day: null }) },
      recent: { da: ["kaffe", "skole"], mix: ["crane", "fløde"] },
      challenge: { code: encodeChallenge("bekir", "da")!, vocab: "da", game: { ...newGame("bekir", null), guesses: ["kaffe"] } },
      news: 3,
    };
    expect(parseSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it("takes the news as unseen unless the save says which it has seen", () => {
    expect(parseSave({ news: 2 }).news).toBe(2);
    for (const news of [undefined, null, "2", -1, 1.5]) expect(parseSave({ news }).news).toBe(0);
  });

  it("reads a save from before Mix, hints and friends' words", () => {
    const old = {
      settings: { mode: "daily", hard: false, theme: null, contrast: false },
      games: { "en-daily": { solution: "crane", guesses: ["slate"], hard: false, day: 4 }, "da-unlimited": { solution: "kaffe", guesses: [], hard: true, day: null } },
      stats: { "en-daily": recordResult(EMPTY_STATS, { won: true, tries: 3, day: 3 }) },
      recent: { da: ["kaffe"] },
    };
    const save = parseSave(old);
    expect(save.settings).toEqual(DEFAULT_SETTINGS);
    expect(save.games).toEqual({ "en-daily": { ...old.games["en-daily"], hints: [] }, "da-unlimited": { ...old.games["da-unlimited"], hints: [] } });
    expect(save.stats).toEqual(old.stats);
    expect(save.challenge).toBeUndefined();
    expect(save.news).toBe(0);
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

  it("only takes Danish letters in Danish and Mix games", () => {
    expect(parseSave({ games: { "en-unlimited": newGame("æbler", null) } }).games).toEqual({});
    expect(parseSave({ games: { "da-unlimited": newGame("æbler", null) } }).games).toEqual({ "da-unlimited": newGame("æbler", null) });
    expect(parseSave({ games: { "mix-unlimited": newGame("æbler", null) } }).games).toEqual({ "mix-unlimited": newGame("æbler", null) });
  });

  it("keeps a hint only where a hint can be: one real slot, and never in a Daily", () => {
    const hints = (key: string, hints: unknown, day: number | null = null) => parseSave({ games: { [key]: { ...newGame("crane", day), hints } } }).games;
    expect(hints("en-unlimited", [3])).toEqual({ "en-unlimited": { ...newGame("crane", null), hints: [3] } });
    expect(hints("en-unlimited", [3, 3, 1, 9, -1, "2"])).toEqual({ "en-unlimited": { ...newGame("crane", null), hints: [3] } });
    expect(hints("en-unlimited", "all")).toEqual({ "en-unlimited": newGame("crane", null) });
    expect(hints("en-daily", [3], 4)).toEqual({ "en-daily": newGame("crane", 4) });
  });

  it("keeps a friend's word only while the code and the game say the same word", () => {
    const code = encodeChallenge("fløde", "mix")!;
    const game = { ...newGame("fløde", null), guesses: ["crane"] };
    expect(parseSave({ challenge: { code, game } }).challenge).toEqual({ code, vocab: "mix", game });
    // The vocabulary comes from the code, whatever the save claims
    expect(parseSave({ challenge: { code, vocab: "en", game } }).challenge?.vocab).toBe("mix");
    expect(parseSave({ challenge: { code, game: newGame("kaffe", null) } }).challenge).toBeUndefined();
    expect(parseSave({ challenge: { code: "abc", game } }).challenge).toBeUndefined();
    expect(parseSave({ challenge: { code, game: newGame("fløde", 4) } }).challenge).toBeUndefined();
    expect(parseSave({ challenge: "fløde" }).challenge).toBeUndefined();
  });

  it("repairs settings and statistics field by field", () => {
    const save = parseSave({
      settings: { mode: "weekly", mix: "yes", hard: "yes", theme: "blue", contrast: true },
      stats: { "en-daily": { ...EMPTY_STATS, played: 2, guesses: [1, 2] }, "da-daily": { played: -1 } },
    });
    expect(save.settings).toEqual({ ...DEFAULT_SETTINGS, contrast: true });
    expect(save.stats["en-daily"]).toEqual({ ...EMPTY_STATS, played: 2 });
    expect(save.stats["da-daily"]).toBeUndefined();
  });

  it("drops statistics with more wins than games", () => {
    const save = parseSave({ stats: { "en-daily": { ...EMPTY_STATS, played: 2, wins: 3 }, "da-daily": { ...EMPTY_STATS, played: 3, wins: 3 } } });
    expect(save.stats["en-daily"]).toBeUndefined();
    expect(save.stats["da-daily"]).toEqual({ ...EMPTY_STATS, played: 3, wins: 3 });
  });

  it("keeps only the latest recent answers", () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) => (i % 2 ? "crane" : "slate"));
    expect(parseSave({ recent: { en: many } }).recent.en).toHaveLength(RECENT_LIMIT);
    expect(parseSave({ recent: { mix: ["crane", "fløde", "nope!"] } }).recent.mix).toEqual(["crane", "fløde"]);
  });
});
