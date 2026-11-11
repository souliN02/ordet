import { describe, expect, it } from "vitest";
import * as da from "@/data/words/da";
import * as en from "@/data/words/en";
import { dailyAnswer, dateKey, dayNumber, FIRST_DAY, isChristmasEve, isNearToday, mixDailyAnswer, msUntilMidnight, parseDateKey } from "./daily";

describe("date keys", () => {
  it("uses the local calendar date", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dateKey(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseDateKey("2026-11-02")).toBe(Date.UTC(2026, 10, 2));
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("2026-1-2")).toBeNull();
    expect(parseDateKey("../../etc")).toBeNull();
  });
});

describe("dayNumber", () => {
  it("counts from puzzle #1 on the first day, across months and DST changes", () => {
    expect(dayNumber(FIRST_DAY)).toBe(1);
    expect(dayNumber("2026-11-03")).toBe(2);
    expect(dayNumber("2027-11-02")).toBe(366);
    expect(dayNumber("2026-11-01")).toBe(0);
  });
});

describe("dailyAnswer", () => {
  it("walks through the list and wraps around, also before puzzle #1", () => {
    const list = ["a", "b", "c"];
    expect([0, 1, 2, 3, 4].map((d) => dailyAnswer(list, d))).toEqual(["a", "b", "c", "a", "b"]);
    expect(dailyAnswer(list, -1)).toBe("c");
  });
});

describe("mixDailyAnswer", () => {
  const answers = { en: en.ANSWERS, da: da.ANSWERS };
  const english = new Set(en.ANSWERS);
  const danish = new Set(da.ANSWERS);
  // The first three years of puzzles
  const days = Array.from({ length: 3 * 365 }, (_, i) => i + 1);
  const words = days.map((day) => mixDailyAnswer(answers, day));
  // Words in both lists could have come from either, so they don't count for one side
  const fromDanish = words.map((word) => (danish.has(word) && !english.has(word) ? 1 : english.has(word) && !danish.has(word) ? 0 : null));

  it("is the same word for everyone on the same day", () => {
    expect(mixDailyAnswer(answers, 10)).toBe(mixDailyAnswer(answers, 10));
    expect(words.every((word) => english.has(word) || danish.has(word))).toBe(true);
  });

  it("is about as often Danish as English", () => {
    const share = fromDanish.filter((side) => side === 1).length / fromDanish.filter((side) => side !== null).length;
    expect(share).toBeGreaterThan(0.45);
    expect(share).toBeLessThan(0.55);
  });

  it("doesn't take turns: the language can't be read off yesterday's", () => {
    const sides = fromDanish.filter((side) => side !== null);
    const repeats = sides.filter((side, i) => i > 0 && side === sides[i - 1]).length / (sides.length - 1);
    expect(repeats).toBeGreaterThan(0.3);
    expect(repeats).toBeLessThan(0.6);
    // Nor off the day of the week
    for (let weekday = 0; weekday < 7; weekday++) {
      const onDay = fromDanish.filter((side, i) => i % 7 === weekday && side !== null);
      const share = onDay.filter((side) => side === 1).length / onDay.length;
      expect(share).toBeGreaterThan(0.35);
      expect(share).toBeLessThan(0.65);
    }
  });

  it("never stays with one language for much more than a week", () => {
    let longest = 0;
    let run = 0;
    fromDanish.forEach((side, i) => {
      run = side !== null && side === fromDanish[i - 1] ? run + 1 : 1;
      longest = Math.max(longest, run);
    });
    expect(longest).toBeLessThanOrEqual(8);
    // And the first month, when the mode is new, is an even one
    const first = fromDanish.slice(0, 30).filter((side) => side === 1).length;
    expect(first).toBeGreaterThanOrEqual(11);
    expect(first).toBeLessThanOrEqual(19);
  });

  it("is never that day's own Daily word in either language", () => {
    expect(days.filter((day, i) => words[i] === dailyAnswer(en.ANSWERS, day) || words[i] === dailyAnswer(da.ANSWERS, day))).toEqual([]);
  });

  it("doesn't come back within those years", () => {
    expect(new Set(words).size).toBe(words.length);
  });

  it("stays put when answers are added at the end", () => {
    const longer = { en: [...en.ANSWERS, "zzzzz"], da: [...da.ANSWERS, "ååååå", "æææææ"] };
    const early = days.slice(0, 600);
    expect(early.map((day) => mixDailyAnswer(longer, day))).toEqual(early.map((day) => mixDailyAnswer(answers, day)));
  });
});

describe("isChristmasEve", () => {
  it("is the 24th of December, any year", () => {
    expect(isChristmasEve("2026-12-24")).toBe(true);
    expect(isChristmasEve("2031-12-24")).toBe(true);
    expect(isChristmasEve("2026-12-25")).toBe(false);
    expect(isChristmasEve("2026-11-24")).toBe(false);
  });
});

describe("isNearToday", () => {
  const noon = Date.UTC(2026, 10, 2, 12);

  it("accepts yesterday, today and tomorrow (every time zone's date)", () => {
    expect(isNearToday("2026-11-01", noon)).toBe(true);
    expect(isNearToday("2026-11-02", noon)).toBe(true);
    expect(isNearToday("2026-11-03", noon)).toBe(true);
  });

  it("refuses anything further out, so the API can't be used to peek ahead", () => {
    expect(isNearToday("2026-11-04", noon)).toBe(false);
    expect(isNearToday("2026-10-31", noon)).toBe(false);
    expect(isNearToday("tomorrow", noon)).toBe(false);
  });
});

describe("msUntilMidnight", () => {
  it("counts down to the next local midnight", () => {
    expect(msUntilMidnight(new Date(2026, 10, 2, 23, 59, 30))).toBe(30_000);
    expect(msUntilMidnight(new Date(2026, 10, 2, 0, 0, 0))).toBeGreaterThan(23 * 3_600_000);
  });
});
