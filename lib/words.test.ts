import { describe, expect, it } from "vitest";
import * as da from "@/data/words/da";
import * as en from "@/data/words/en";
import { KEYBOARDS } from "@/data/ui";
import { LANGS } from "./i18n";
import { ALPHABET, makeWordList, pickAnswer, toLetter, WORD_LENGTH } from "./words";

const LISTS = { en, da };

describe("the word lists", () => {
  for (const lang of LANGS) {
    const { ANSWERS, GUESSES } = LISTS[lang];
    const letters = new RegExp(`^[${ALPHABET[lang]}]{${WORD_LENGTH}}$`);

    it(`${lang}: has only five-letter words in the language's alphabet`, () => {
      expect(ANSWERS.filter((w) => !letters.test(w))).toEqual([]);
      expect(GUESSES.filter((w) => !letters.test(w))).toEqual([]);
    });

    it(`${lang}: has no duplicates, and no answer twice among the guesses`, () => {
      expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
      expect(new Set(GUESSES).size).toBe(GUESSES.length);
      const answers = new Set(ANSWERS);
      expect(GUESSES.filter((w) => answers.has(w))).toEqual([]);
    });

    it(`${lang}: has years of daily words`, () => {
      expect(ANSWERS.length).toBeGreaterThan(3 * 365);
    });

    it(`${lang}: can be typed on the on-screen keyboard`, () => {
      expect([...KEYBOARDS[lang].join("")].sort().join("")).toBe([...ALPHABET[lang]].sort().join(""));
    });
  }

  it("uses the Danish letters in Danish words", () => {
    expect(da.ANSWERS.some((w) => /[æøå]/.test(w))).toBe(true);
    expect(da.GUESSES).toContain("huset");
  });
});

describe("toLetter", () => {
  it("accepts the language's letters in either case", () => {
    expect(toLetter("A", "en")).toBe("a");
    expect(toLetter("Æ", "da")).toBe("æ");
    expect(toLetter("ø", "da")).toBe("ø");
  });

  it("refuses other keys and letters from the other language", () => {
    expect(toLetter("ø", "en")).toBeNull();
    expect(toLetter("Enter", "en")).toBeNull();
    expect(toLetter("1", "da")).toBeNull();
    expect(toLetter("", "en")).toBeNull();
  });

  it("joins a decomposed å into one letter", () => {
    expect(toLetter("å", "da")).toBe("å");
  });
});

describe("pickAnswer", () => {
  it("avoids recent answers while it can", () => {
    expect(pickAnswer(["crane", "slate", "react"], ["crane", "react"], () => 0.99)).toBe("slate");
  });

  it("starts over once every answer has been used", () => {
    expect(pickAnswer(["crane", "slate"], ["crane", "slate"], () => 0)).toBe("crane");
  });
});

describe("makeWordList", () => {
  it("accepts answers and guesses alike", () => {
    const list = makeWordList(["crane"], ["slate"]);
    expect(list.accepted.has("crane") && list.accepted.has("slate")).toBe(true);
  });
});
