/**
 * "What's new" is a dialog for players who were here before the latest news: they get it once,
 * the next time they open the game. Someone new gets the help instead, since all of it is new to
 * them. The news itself is in data/ui.ts.
 */

/** The number of the latest batch of news. Raise it when the news changes, and everyone who has played sees the dialog once more. */
export const NEWS = 1;

/**
 * The dialog a visit opens with, if any: the help for someone new, the news for someone who hasn't
 * seen the latest. A friend's word isn't interrupted by it: the news waits for the next visit.
 */
export function welcome({ firstVisit, seen, friend }: { firstVisit: boolean; seen: number; friend: boolean }): "help" | "news" | null {
  if (firstVisit) return "help";
  return seen < NEWS && !friend ? "news" : null;
}
