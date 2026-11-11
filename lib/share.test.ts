import { describe, expect, it } from "vitest";
import { newGame } from "./game";
import { shareText } from "./share";

describe("shareText", () => {
  const won = { ...newGame("react", 12), guesses: ["slate", "crane", "react"] };

  it("shows the puzzle, language, score and squares, and never the letters", () => {
    const text = shareText(won, { vocab: "en", dark: false, contrast: false });
    expect(text).toBe(["Ordet #12 EN 3/6", "", "⬜⬜🟩🟨🟨", "🟨🟨🟩⬜🟨", "🟩🟩🟩🟩🟩", "", "ordet.bekirsaliv.dk"].join("\n"));
    expect(text).not.toMatch(/react|crane/i);
  });

  it("matches the theme and the high contrast colors", () => {
    const text = shareText(won, { vocab: "en", dark: true, contrast: true });
    expect(text).toContain("⬛⬛🟧🟦🟦");
    expect(text).toContain("🟧🟧🟧🟧🟧");
  });

  it("marks hard mode, losses, Unlimited and the Danish link", () => {
    const lost = { ...newGame("kaffe", null), guesses: Array(6).fill("skole"), hard: true };
    const text = shareText(lost, { vocab: "da", dark: false, contrast: false });
    expect(text.split("\n")[0]).toBe("Ordet ∞ DA X/6*");
    expect(text.endsWith("ordet.bekirsaliv.dk/?lang=da")).toBe(true);
  });

  it("says Mix without saying which language the word was", () => {
    const text = shareText({ ...newGame("fløde", 12), guesses: ["crane", "fløde"] }, { vocab: "mix", dark: false, contrast: false });
    expect(text.split("\n")[0]).toBe("Ordet #12 MIX 2/6");
    expect(text.endsWith("ordet.bekirsaliv.dk/?lang=mix")).toBe(true);
  });

  it("marks a hint, after the hard mode star", () => {
    const hinted = { ...newGame("react", null), guesses: ["react"], hints: [2] };
    expect(shareText(hinted, { vocab: "en", dark: false, contrast: false }).split("\n")[0]).toBe("Ordet ∞ EN 1/6 💡");
    expect(shareText({ ...hinted, hard: true }, { vocab: "en", dark: false, contrast: false }).split("\n")[0]).toBe("Ordet ∞ EN 1/6* 💡");
  });

  it("ends in a link to the same word when it's given one", () => {
    const text = shareText({ ...won, day: null }, { vocab: "en", dark: false, contrast: false, same: { label: "Try the same word:", link: "ordet.bekirsaliv.dk/?c=abc1234" } });
    expect(text.split("\n").slice(-3)).toEqual(["", "Try the same word:", "ordet.bekirsaliv.dk/?c=abc1234"]);
    expect(text).not.toMatch(/react|crane/i);
  });
});
