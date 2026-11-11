import { describe, expect, it } from "vitest";
import { currentStreak, EMPTY_STATS, isMilestone, recordResult, winRate } from "./stats";

describe("daily statistics", () => {
  it("counts a win and its number of guesses", () => {
    const s = recordResult(EMPTY_STATS, { won: true, tries: 3, day: 10 });
    expect(s).toMatchObject({ played: 1, wins: 1, streak: 1, best: 1, lastDay: 10 });
    expect(s.guesses).toEqual([0, 0, 1, 0, 0, 0]);
  });

  it("keeps a streak on consecutive days and restarts it after a gap", () => {
    let s = recordResult(EMPTY_STATS, { won: true, tries: 3, day: 10 });
    s = recordResult(s, { won: true, tries: 4, day: 11 });
    expect(s.streak).toBe(2);
    s = recordResult(s, { won: true, tries: 2, day: 13 });
    expect(s).toMatchObject({ streak: 1, best: 2 });
  });

  it("ends the streak with a loss", () => {
    let s = recordResult(EMPTY_STATS, { won: true, tries: 3, day: 10 });
    s = recordResult(s, { won: false, tries: 6, day: 11 });
    expect(s).toMatchObject({ played: 2, wins: 1, streak: 0, best: 1 });
    expect(s.guesses).toEqual([0, 0, 1, 0, 0, 0]);
  });

  it("counts each day once", () => {
    const s = recordResult(EMPTY_STATS, { won: true, tries: 3, day: 10 });
    expect(recordResult(s, { won: true, tries: 1, day: 10 })).toBe(s);
    expect(recordResult(s, { won: true, tries: 1, day: 9 })).toBe(s);
  });

  it("shows a streak only while it's still alive", () => {
    const s = recordResult(EMPTY_STATS, { won: true, tries: 3, day: 10 });
    expect(currentStreak(s, 10)).toBe(1);
    expect(currentStreak(s, 11)).toBe(1);
    expect(currentStreak(s, 12)).toBe(0);
  });
});

describe("unlimited statistics", () => {
  it("counts wins in a row, with no days involved", () => {
    let s = recordResult(EMPTY_STATS, { won: true, tries: 5, day: null });
    s = recordResult(s, { won: true, tries: 2, day: null });
    expect(s).toMatchObject({ played: 2, streak: 2, best: 2, lastDay: null });
    expect(currentStreak(s, null)).toBe(2);
    s = recordResult(s, { won: false, tries: 6, day: null });
    expect(s).toMatchObject({ played: 3, streak: 0, best: 2 });
  });
});

describe("isMilestone", () => {
  it("celebrates a week, a fortnight and a month of daily words", () => {
    expect([1, 5, 7, 10, 14, 30, 31, 365].filter((n) => isMilestone(n, true))).toEqual([7, 14, 30, 365]);
  });

  it("celebrates rounder numbers where the words come faster", () => {
    expect([1, 5, 7, 10, 14, 25, 30].filter((n) => isMilestone(n, false))).toEqual([5, 10, 25]);
  });

  it("has nothing to celebrate without a streak", () => {
    expect(isMilestone(0, true) || isMilestone(0, false)).toBe(false);
  });
});

describe("winRate", () => {
  it("rounds to a whole percentage and is 0 before any game", () => {
    expect(winRate(EMPTY_STATS)).toBe(0);
    expect(winRate({ ...EMPTY_STATS, played: 3, wins: 2 })).toBe(67);
  });
});
