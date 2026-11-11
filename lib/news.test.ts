import { describe, expect, it } from "vitest";
import { NEWS, welcome } from "./news";

describe("welcome", () => {
  it("opens the help for someone new, whatever else is going on", () => {
    expect(welcome({ firstVisit: true, seen: 0, friend: false })).toBe("help");
    expect(welcome({ firstVisit: true, seen: 0, friend: true })).toBe("help");
  });

  it("opens the news for someone who was here before it", () => {
    expect(welcome({ firstVisit: false, seen: 0, friend: false })).toBe("news");
    expect(welcome({ firstVisit: false, seen: NEWS - 1, friend: false })).toBe("news");
  });

  it("opens nothing for someone who has seen the latest", () => {
    expect(welcome({ firstVisit: false, seen: NEWS, friend: false })).toBeNull();
    expect(welcome({ firstVisit: false, seen: NEWS + 5, friend: false })).toBeNull();
  });

  it("doesn't put the news in front of a friend's word", () => {
    expect(welcome({ firstVisit: false, seen: 0, friend: true })).toBeNull();
  });
});
