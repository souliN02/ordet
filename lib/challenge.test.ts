import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as da from "@/data/words/da";
import * as en from "@/data/words/en";
import { challengeLink, decodeChallenge, encodeChallenge, isBlocked } from "./challenge";
import { VOCABS } from "./words";

/** The words of a block list in scripts/words: everything that isn't a comment */
function blockList(lang: "en" | "da"): string[] {
  const text = readFileSync(new URL(`../scripts/words/block-${lang}.txt`, import.meta.url), "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("#"))
    .join(" ")
    .split(/\s+/)
    .filter((word) => [...word].length === 5);
}

describe("challenge codes", () => {
  it("carry a word and what it's played with, there and back", () => {
    expect(decodeChallenge(encodeChallenge("crane", "en")!)).toEqual({ word: "crane", vocab: "en" });
    expect(decodeChallenge(encodeChallenge("fløde", "da")!)).toEqual({ word: "fløde", vocab: "da" });
    expect(decodeChallenge(encodeChallenge("ærgre", "mix")!)).toEqual({ word: "ærgre", vocab: "mix" });
    // Not a word in any list: a name works too
    expect(decodeChallenge(encodeChallenge("bekir", "da")!)).toEqual({ word: "bekir", vocab: "da" });
    expect(decodeChallenge(encodeChallenge("zzzzz", "en")!)).toEqual({ word: "zzzzz", vocab: "en" });
    expect(decodeChallenge(encodeChallenge("ååååå", "mix")!)).toEqual({ word: "ååååå", vocab: "mix" });
  });

  it("round-trip every answer in every vocabulary it can be played in", () => {
    const answers = { en: en.ANSWERS, da: da.ANSWERS, mix: [...en.ANSWERS, ...da.ANSWERS] };
    for (const vocab of VOCABS) {
      const codes = answers[vocab].map((word) => encodeChallenge(word, vocab));
      expect(codes.every((code) => code !== null && /^[0-9a-z]{7}$/.test(code))).toBe(true);
      expect(codes.map((code) => decodeChallenge(code!)?.word)).toEqual(answers[vocab]);
      expect(new Set(codes).size).toBe(new Set(answers[vocab]).size);
    }
  });

  it("don't give the word away", () => {
    const code = encodeChallenge("crane", "en")!;
    expect(code).not.toContain("crane");
    // A neighbouring word looks nothing like it
    const other = encodeChallenge("crank", "en")!;
    expect([...code].filter((char, i) => char !== other[i]).length).toBeGreaterThanOrEqual(4);
    expect(encodeChallenge("crane", "mix")).not.toBe(code);
  });

  it("refuse words that aren't five of the vocabulary's letters", () => {
    expect(encodeChallenge("cran", "en")).toBeNull();
    expect(encodeChallenge("cranes", "en")).toBeNull();
    expect(encodeChallenge("fløde", "en")).toBeNull();
    expect(encodeChallenge("CRANE", "en")).toBeNull();
    expect(encodeChallenge("cr4ne", "mix")).toBeNull();
  });

  it("refuse anything that isn't a code, and nearly every mistyped one", () => {
    for (const junk of ["", "crane", "1234567890", "ABCDEFG", "zzzzzzz", "../../.."]) expect(decodeChallenge(junk)).toBeNull();
    const code = encodeChallenge("crane", "en")!;
    const typos = [...code].flatMap((char, i) => [..."0123456789abcdefghijklmnopqrstuvwxyz"].filter((c) => c !== char).map((c) => code.slice(0, i) + c + code.slice(i + 1)));
    const accepted = typos.filter((typo) => decodeChallenge(typo) !== null);
    expect(accepted.length / typos.length).toBeLessThan(0.06);
  });

  it("refuse the words the lists block, as hashes that match the block files", () => {
    for (const lang of ["en", "da"] as const) {
      const blocked = blockList(lang);
      expect(blocked.length).toBeGreaterThan(0);
      for (const word of blocked) {
        expect(isBlocked(word, lang)).toBe(true);
        expect(isBlocked(word, "mix")).toBe(true);
        expect(encodeChallenge(word, lang)).toBeNull();
      }
    }
    // Nothing the game itself can pick is refused
    expect(en.ANSWERS.filter((word) => isBlocked(word, "en") || isBlocked(word, "mix"))).toEqual([]);
    expect(da.ANSWERS.filter((word) => isBlocked(word, "da") || isBlocked(word, "mix"))).toEqual([]);
    expect([...da.GUESSES].filter((word) => isBlocked(word, "da"))).toEqual([]);
  });

  it("make a link without the https://", () => {
    expect(challengeLink("abc1234")).toBe("ordet.bekirsaliv.dk/?c=abc1234");
  });
});
