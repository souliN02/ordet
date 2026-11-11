import { describe, expect, it } from "vitest";
import { UI } from "@/data/ui";
import * as da from "@/data/words/da";
import * as en from "@/data/words/en";
import { LANG_KEY, LANG_SCRIPT, pickLang } from "./i18n";

describe("pickLang", () => {
  it("lets a ?lang= link win, then the saved pick, then the browser", () => {
    expect(pickLang({ search: "?lang=da", saved: "en", browser: ["en-US"] })).toBe("da");
    expect(pickLang({ search: "?lang=xx", saved: "da", browser: ["en-US"] })).toBe("da");
    expect(pickLang({ browser: ["de-DE", "da-DK", "en"] })).toBe("da");
    expect(pickLang({ browser: ["de-DE"] })).toBe("en");
  });
});

type Visit = { search?: string; saved?: string | null; browser?: string[] };

/** Runs the layout's script in a made-up browser and returns the language it left on <html> (the server's is en) */
function scriptLang({ search = "", saved = null, browser = [] }: Visit, storage: Pick<Storage, "getItem"> = { getItem: (key) => (key === LANG_KEY ? saved : null) }) {
  const html = { lang: "en" };
  const run = new Function("document", "location", "localStorage", "navigator", LANG_SCRIPT) as (...globals: unknown[]) => void;
  run({ documentElement: html }, { search }, storage, { languages: browser, language: browser[0] });
  return html.lang;
}

describe("LANG_SCRIPT", () => {
  it("picks what pickLang picks, before the game has loaded", () => {
    const visits: Visit[] = [
      { search: "?lang=da", saved: "en", browser: ["en-US"] },
      { search: "?lang=EN", saved: "da", browser: ["da"] },
      { search: "?lang=xx", saved: "da", browser: ["en-US"] },
      { saved: "xx", browser: ["de-DE", "da-DK", "en"] },
      { browser: ["de-DE"] },
      {},
    ];
    for (const visit of visits) expect(scriptLang(visit)).toBe(pickLang(visit));
  });

  it("still goes by the browser when site data is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(scriptLang({ browser: ["da-DK"] }, blocked)).toBe("da");
  });
});

/** Arguments that fit the interface's text functions: (n, letter, mark) and (guess, marks) */
const SAMPLES: unknown[][] = [
  ["a", "a", "correct"],
  ["a", ["a"]],
];

/** Every string in the interface, with the functions called on sample values */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    for (const args of SAMPLES) {
      try {
        return strings((value as (...args: unknown[]) => unknown)(...args));
      } catch {}
    }
    return [];
  }
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

describe("the interface text", () => {
  it("has a Danish string for every English one", () => {
    expect(strings(UI.da)).toHaveLength(strings(UI.en).length);
  });

  it("uses no em dashes", () => {
    expect([...strings(UI.en), ...strings(UI.da)].filter((s) => s.includes("—"))).toEqual([]);
  });

  it("only has easter eggs for words that can be guessed", () => {
    const guessable = new Set([...en.ANSWERS, ...en.GUESSES, ...da.ANSWERS, ...da.GUESSES]);
    expect(Object.keys(UI.en.eggs).filter((word) => !guessable.has(word))).toEqual([]);
    expect(Object.keys(UI.da.eggs).sort()).toEqual(Object.keys(UI.en.eggs).sort());
  });

  it("has as many lines for a win in Danish as in English, for each number of guesses", () => {
    expect(UI.en.wins).toHaveLength(6);
    expect(UI.da.wins.map((lines) => lines.length)).toEqual(UI.en.wins.map((lines) => lines.length));
    expect([...UI.en.wins, ...UI.da.wins].every((lines) => lines.length > 0)).toBe(true);
  });

  it("explains each help example with the tile it marks", () => {
    for (const lang of ["en", "da"] as const) {
      for (const { word, index, text } of UI[lang].help.examples) {
        expect(word).toHaveLength(5);
        expect(text.startsWith(word[index]!.toUpperCase())).toBe(true);
      }
    }
  });
});
