import { describe, expect, it } from "vitest";
import { newGame } from "./game";
import { shareText } from "./share";

describe("shareText", () => {
  const won = { ...newGame("react", 12), guesses: ["slate", "crane", "react"] };

  it("shows the puzzle, language, score and squares, and never the letters", () => {
    const text = shareText(won, { lang: "en", dark: false, contrast: false });
    expect(text).toBe(["Ordet #12 EN 3/6", "", "⬜⬜🟩🟨🟨", "🟨🟨🟩⬜🟨", "🟩🟩🟩🟩🟩", "", "ordet.bekirsaliv.dk"].join("\n"));
    expect(text).not.toMatch(/react|crane/i);
  });

  it("matches the theme and the high contrast colors", () => {
    const text = shareText(won, { lang: "en", dark: true, contrast: true });
    expect(text).toContain("⬛⬛🟧🟦🟦");
    expect(text).toContain("🟧🟧🟧🟧🟧");
  });

  it("marks hard mode, losses, Unlimited and the Danish link", () => {
    const lost = { ...newGame("kaffe", null), guesses: Array(6).fill("skole"), hard: true };
    const text = shareText(lost, { lang: "da", dark: false, contrast: false });
    expect(text.split("\n")[0]).toBe("Ordet ∞ DA X/6*");
    expect(text.endsWith("ordet.bekirsaliv.dk/?lang=da")).toBe(true);
  });
});
