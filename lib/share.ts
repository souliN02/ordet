import { evaluate, status, type Game, type Mark } from "./game";
import { SITE_URL } from "./site";
import { MAX_GUESSES, type Vocab } from "./words";

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
 * ∞ replaces the number when it isn't the day's word, X the score after a loss, * marks hard mode
 * and 💡 a hint. A word that isn't the day's can end in a link to that same word instead (`same`),
 * so the friend who gets the result can try it too.
 */
export function shareText(
  game: Game,
  { vocab, dark, contrast, same }: { vocab: Vocab; dark: boolean; contrast: boolean; same?: { label: string; link: string } },
): string {
  const score = status(game) === "won" ? String(game.guesses.length) : "X";
  const extras = (game.hard ? "*" : "") + (game.hints.length > 0 ? ` ${"💡".repeat(game.hints.length)}` : "");
  const title = `Ordet ${game.day === null ? "∞" : `#${game.day}`} ${vocab.toUpperCase()} ${score}/${MAX_GUESSES}${extras}`;
  const rows = game.guesses.map((guess) => evaluate(guess, game.solution).map((mark) => square(mark, dark, contrast)).join(""));
  const ending = same ? [same.label, same.link] : [SITE_URL.replace("https://", "") + (vocab === "en" ? "" : `/?lang=${vocab}`)];
  return [title, "", ...rows, "", ...ending].join("\n");
}
