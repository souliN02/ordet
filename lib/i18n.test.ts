import { describe, expect, it } from "vitest";
import { UI } from "@/data/ui";
import { pickLang } from "./i18n";

describe("pickLang", () => {
  it("lets a ?lang= link win, then the saved pick, then the browser", () => {
    expect(pickLang({ search: "?lang=da", saved: "en", browser: ["en-US"] })).toBe("da");
    expect(pickLang({ search: "?lang=xx", saved: "da", browser: ["en-US"] })).toBe("da");
    expect(pickLang({ browser: ["de-DE", "da-DK", "en"] })).toBe("da");
    expect(pickLang({ browser: ["de-DE"] })).toBe("en");
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

  it("explains each help example with the tile it marks", () => {
    for (const lang of ["en", "da"] as const) {
      for (const { word, index, text } of UI[lang].help.examples) {
        expect(word).toHaveLength(5);
        expect(text.startsWith(word[index]!.toUpperCase())).toBe(true);
      }
    }
  });
});
