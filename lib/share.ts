import { evaluate, status, type Game, type Mark } from "./game";
import type { Lang } from "./i18n";
import { SITE_URL } from "./site";
import { MAX_GUESSES } from "./words";

/** The squares match what's on screen: orange and blue in high contrast, black or white for misses */
function square(mark: Mark, dark: boolean, contrast: boolean): string {
  if (mark === "correct") return contrast ? "🟧" : "🟩";
  if (mark === "present") return contrast ? "🟦" : "🟨";
  return dark ? "⬛" : "⬜";
}

/**
 * The spoiler-free result to paste in a chat:
 *
 *   Ordet #12 DA 4/6*
 *
 *   ⬜🟨⬜⬜⬜
 *   ...
 *   ordet.bekirsaliv.dk/?lang=da
 *
 * ∞ replaces the number in Unlimited, X the score after a loss, and * marks hard mode.
 */
export function shareText(game: Game, { lang, dark, contrast }: { lang: Lang; dark: boolean; contrast: boolean }): string {
  const score = status(game) === "won" ? String(game.guesses.length) : "X";
  const title = `Ordet ${game.day === null ? "∞" : `#${game.day}`} ${lang.toUpperCase()} ${score}/${MAX_GUESSES}${game.hard ? "*" : ""}`;
  const rows = game.guesses.map((guess) => evaluate(guess, game.solution).map((mark) => square(mark, dark, contrast)).join(""));
  const link = SITE_URL.replace("https://", "") + (lang === "en" ? "" : `/?lang=${lang}`);
  return [title, "", ...rows, "", link].join("\n");
}
