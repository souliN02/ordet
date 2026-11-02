import { describe, expect, it } from "vitest";
import { parseNytSolution } from "./nyt";

describe("parseNytSolution", () => {
  it("takes the solution from the Times' JSON", () => {
    expect(parseNytSolution({ id: 1, solution: "crane", print_date: "2026-11-02", days_since_launch: 1600 })).toBe("crane");
    expect(parseNytSolution({ solution: "CRANE" })).toBe("crane");
  });

  it("returns null for anything that doesn't look like a word", () => {
    expect(parseNytSolution(null)).toBeNull();
    expect(parseNytSolution({})).toBeNull();
    expect(parseNytSolution({ solution: "cranes" })).toBeNull();
    expect(parseNytSolution({ solution: "<b>x" })).toBeNull();
    expect(parseNytSolution({ solution: 12345 })).toBeNull();
    expect(parseNytSolution("crane")).toBeNull();
  });
});
