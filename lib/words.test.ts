import { describe, expect, it } from "vitest";
import * as da from "@/data/words/da";
import * as en from "@/data/words/en";
import { KEYBOARDS } from "@/data/ui";
import { dailyAnswer } from "./daily";
import { LANGS } from "./i18n";
import { ALPHABET, dailyWord, isVocab, makeVocabulary, makeWordList, pickAnswer, pickFrom, toLetter, VOCABS, WORD_LENGTH, wordLangs } from "./words";

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

  }

  for (const vocab of VOCABS) {
    it(`${vocab}: can be typed on the on-screen keyboard`, () => {
      expect([...KEYBOARDS[vocab].join("")].sort().join("")).toBe([...ALPHABET[vocab]].sort().join(""));
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

describe("vocabularies", () => {
  const english = makeWordList(["crane", "sport"], ["slate"]);
  const danish = makeWordList(["kaffe", "sport"], ["huset"]);
  const mix = makeVocabulary({ en: english, da: danish });

  it("are English, Danish or Mix", () => {
    expect(VOCABS.filter(isVocab)).toEqual(["en", "da", "mix"]);
    expect(isVocab("fr")).toBe(false);
    expect(isVocab(null)).toBe(false);
  });

  it("take every letter of both languages in Mix", () => {
    expect(toLetter("q", "mix")).toBe("q");
    expect(toLetter("Ø", "mix")).toBe("ø");
  });

  it("accept one language's words, or both in Mix", () => {
    expect(makeVocabulary({ da: danish }).accepted).toBe(danish.accepted);
    expect([...mix.accepted].sort()).toEqual(["crane", "huset", "kaffe", "slate", "sport"]);
  });

  it("know which language a word came from", () => {
    expect(wordLangs(mix, "crane")).toEqual(["en"]);
    expect(wordLangs(mix, "huset")).toEqual(["da"]);
    expect(wordLangs(mix, "sport")).toEqual(["en", "da"]);
    expect(wordLangs(mix, "bekir")).toEqual([]);
    expect(wordLangs(makeVocabulary({ en: english }), "kaffe")).toEqual([]);
  });

  it("pick an answer from the one list, as before", () => {
    expect(pickFrom(makeVocabulary({ en: english }), ["crane"], () => 0.99)).toBe("sport");
  });

  it("flip a coin for the language in Mix, then pick from that language", () => {
    const rolls = (...values: number[]) => () => values.shift() ?? 0;
    expect(pickFrom(mix, [], rolls(0.1, 0))).toBe("crane");
    expect(pickFrom(mix, [], rolls(0.9, 0))).toBe("kaffe");
    expect(pickFrom(mix, ["kaffe"], rolls(0.9, 0))).toBe("sport");
  });

  it("take the day's word from the language's schedule, and Mix's from its own", () => {
    expect(dailyWord(makeVocabulary({ da: danish }), 3)).toBe(dailyAnswer(danish.answers, 3));
    expect(["crane", "sport", "kaffe"]).toContain(dailyWord(mix, 3));
  });

  it("share a good many words between the languages, which is what makes Mix a puzzle", () => {
    const real = makeVocabulary({ en: makeWordList(en.ANSWERS, en.GUESSES), da: makeWordList(da.ANSWERS, da.GUESSES) });
    const both = [...real.accepted].filter((word) => wordLangs(real, word).length === 2);
    expect(both.length).toBeGreaterThan(1000);
    expect(real.accepted.size).toBe(en.ANSWERS.length + en.GUESSES.length + da.ANSWERS.length + da.GUESSES.length - both.length);
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
