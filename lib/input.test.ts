import { describe, expect, it } from "vitest";
import { backspace, clearSlot, draftWord, EMPTY_DRAFT, moveTo, step, typeLetter, type Draft } from "./input";

const typed = (word: string, from: Draft = EMPTY_DRAFT) => [...word].reduce(typeLetter, from);
/** The row as text, _ for an empty slot and | before the cursor's slot */
const show = (d: Draft) => d.letters.map((l, i) => (i === d.cursor ? "|" : "") + (l || "_")).join("") + (d.cursor === 5 ? "|" : "");

describe("typing left to right", () => {
  it("fills the row and parks the cursor past the end", () => {
    const d = typed("crane");
    expect(show(d)).toBe("crane|");
    expect(draftWord(d)).toBe("crane");
  });

  it("ignores a sixth letter instead of overwriting the fifth", () => {
    const d = typed("crane");
    expect(typeLetter(d, "s")).toBe(d);
  });

  it("takes letters back one at a time with Backspace", () => {
    expect(show(backspace(typed("crane")))).toBe("cran|_");
    expect(show(backspace(backspace(typed("crane"))))).toBe("cra|__");
    expect(backspace(EMPTY_DRAFT)).toBe(EMPTY_DRAFT);
  });
});

describe("typing in any order", () => {
  it("fills the gaps around a letter placed first", () => {
    // a known A in the middle, then c, r and n typed from the start
    let d = typed("a", moveTo(EMPTY_DRAFT, 2));
    expect(show(d)).toBe("__a|__");
    d = typed("e", moveTo(d, 4));
    expect(show(d)).toBe("|__a_e");
    d = typed("crn", d);
    expect(show(d)).toBe("crane|");
  });

  it("overwrites the tile under the cursor and jumps to the next gap", () => {
    const d = typed("k", moveTo(typed("cra"), 0));
    expect(show(d)).toBe("kra|__");
  });

  it("fixes one letter of a full row and parks past the end again", () => {
    const d = typed("o", moveTo(typed("crane"), 2));
    expect(show(d)).toBe("crone|");
  });
});

describe("Backspace and Delete", () => {
  it("clear the letter under the cursor first", () => {
    const d = moveTo(typed("crane"), 1);
    expect(show(backspace(d))).toBe("c|_ane");
    expect(show(clearSlot(d))).toBe("c|_ane");
  });

  it("Backspace on an empty slot steps back and clears that one", () => {
    expect(show(typed("cra"))).toBe("cra|__");
    expect(show(backspace(typed("cra")))).toBe("cr|___");
  });

  it("Delete on an empty slot does nothing", () => {
    const d = moveTo(typed("cr"), 3);
    expect(clearSlot(d)).toBe(d);
  });
});

describe("moving the cursor", () => {
  it("steps within the row and never off it", () => {
    expect(step(EMPTY_DRAFT, -1)).toBe(EMPTY_DRAFT);
    expect(step(moveTo(EMPTY_DRAFT, 4), 1).cursor).toBe(4);
    expect(step(EMPTY_DRAFT, 1).cursor).toBe(1);
  });

  it("comes back from past the end onto the last slot", () => {
    const full = typed("crane");
    expect(step(full, -1).cursor).toBe(4);
    expect(step(full, 1)).toBe(full);
  });

  it("clamps a slot that's out of range", () => {
    expect(moveTo(EMPTY_DRAFT, 9).cursor).toBe(4);
    expect(moveTo(EMPTY_DRAFT, -3)).toBe(EMPTY_DRAFT);
  });

  it("leaves the letters alone", () => {
    expect(moveTo(typed("cra"), 0).letters).toEqual(["c", "r", "a", "", ""]);
  });
});

describe("draftWord", () => {
  it("is short while a slot is empty, so the guess is refused as too short", () => {
    expect(draftWord(clearSlot(moveTo(typed("crane"), 2)))).toBe("crne");
  });
});
