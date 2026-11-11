import { describe, expect, it } from "vitest";
import { newGame } from "./game";
import { DEFAULT_SETTINGS, EMPTY_SAVE, type Save } from "./save";
import { EMPTY_STATS, recordResult } from "./stats";
import { applyTransfer, exportCode, importCode } from "./transfer";

const played = recordResult(recordResult(EMPTY_STATS, { won: true, tries: 3, day: 9 }), { won: true, tries: 4, day: 10 });
const save: Save = {
  settings: { ...DEFAULT_SETTINGS, mode: "unlimited", mix: true, hard: true, theme: "dark" },
  games: { "en-daily": newGame("crane", 10) },
  stats: { "en-daily": played, "da-unlimited": recordResult(EMPTY_STATS, { won: false, tries: 6, day: null }), "mix-daily": EMPTY_STATS },
  recent: { da: ["kaffe"] },
  news: 1,
};

describe("transfer codes", () => {
  it("carry the statistics and the look-and-feel settings, and nothing else", () => {
    const code = exportCode(save);
    expect(code).toMatch(/^ORDET1[A-Za-z0-9_-]+$/);
    expect(importCode(code)).toEqual({
      settings: { hard: true, theme: "dark", contrast: false },
      // A slot nobody has played isn't worth carrying
      stats: { "en-daily": played, "da-unlimited": save.stats["da-unlimited"] },
    });
    expect(code).not.toContain("crane");
  });

  it("survive the spaces and line breaks a message app adds", () => {
    const code = exportCode(save);
    expect(importCode(`  ${code.slice(0, 20)}\n${code.slice(20, 40)} ${code.slice(40)}\n`)).toEqual(importCode(code));
  });

  it("work for a player with nothing yet", () => {
    expect(importCode(exportCode(EMPTY_SAVE))).toEqual({ settings: { hard: false, theme: null, contrast: false }, stats: {} });
  });

  it("are refused when cut short, changed or not a code at all", () => {
    const code = exportCode(save);
    expect(importCode(code.slice(0, -3))).toBeNull();
    expect(importCode(code.slice(0, 30) + (code[30] === "A" ? "B" : "A") + code.slice(31))).toBeNull();
    expect(importCode(code.toLowerCase())).toBeNull();
    for (const junk of ["", "hello", "ORDET1", "ORDET10000000", "ORDET2" + code.slice(6)]) expect(importCode(junk)).toBeNull();
  });

  it("have their contents checked like any saved data", () => {
    // A code somebody built by hand: the checksum is right, the statistics aren't
    const forge = (data: unknown) => {
      const body = btoa(JSON.stringify(data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      let h = 0x811c9dc5;
      for (let i = 0; i < body.length; i++) h = Math.imul(h ^ body.charCodeAt(i), 0x01000193);
      return "ORDET1" + (h >>> 0).toString(36).padStart(7, "0") + body;
    };
    const forged = importCode(forge({ p: ["yes", "blue", 1], s: { "en-daily": [2, 3, 1, 1, 5, 0, 0, 1, 0, 0, 0], "da-daily": [3, 3, 9, 9, 7, 1, 1, 1, 0, 0, 0], "xx-daily": [1, 1, 1, 1, 1], nope: "x" } }));
    expect(forged).toEqual({
      settings: { hard: false, theme: null, contrast: false },
      stats: { "da-daily": { played: 3, wins: 3, streak: 9, best: 9, lastDay: 7, guesses: [1, 1, 1, 0, 0, 0] } },
    });
    expect(importCode(forge([1, 2, 3]))).toBeNull();
    expect(importCode(forge({ p: [], s: [] }))).toBeNull();
  });
});

describe("applyTransfer", () => {
  it("replaces the statistics and keeps the games, the mode, the language pick and the news already seen", () => {
    const here: Save = { ...EMPTY_SAVE, settings: { ...DEFAULT_SETTINGS, mode: "daily" }, games: { "da-daily": newGame("kaffe", 10) }, stats: { "da-daily": played, "en-unlimited": played }, news: 4 };
    const moved = applyTransfer(here, importCode(exportCode(save))!);
    expect(moved.stats).toEqual({ "en-daily": played, "da-unlimited": save.stats["da-unlimited"] });
    expect(moved.games).toEqual(here.games);
    expect(moved.news).toBe(4);
    expect(moved.settings).toEqual({ mode: "daily", mix: false, hard: true, theme: "dark", contrast: false });
  });
});
