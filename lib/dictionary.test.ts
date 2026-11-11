import { describe, expect, it } from "vitest";
import { dictionaryUrl } from "./dictionary";

describe("dictionaryUrl", () => {
  it("looks Danish words up in Den Danske Ordbog, with the Danish letters escaped", () => {
    expect(dictionaryUrl("kaffe", "da")).toBe("https://ordnet.dk/ddo/ordbog?query=kaffe");
    expect(dictionaryUrl("fløde", "da")).toBe("https://ordnet.dk/ddo/ordbog?query=fl%C3%B8de");
  });

  it("looks English words up in Wiktionary's English entry", () => {
    expect(dictionaryUrl("crane", "en")).toBe("https://en.wiktionary.org/wiki/crane#English");
  });
});
