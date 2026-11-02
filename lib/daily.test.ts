import { describe, expect, it } from "vitest";
import { dailyAnswer, dateKey, dayNumber, FIRST_DAY, isNearToday, msUntilMidnight, parseDateKey } from "./daily";

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
