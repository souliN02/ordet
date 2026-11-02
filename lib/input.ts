import { WORD_LENGTH } from "./words";

/**
 * The row being typed: a letter or "" per slot, and the cursor on the slot the
 * next letter goes into. The player can put the cursor on any slot (a tap on a
 * tile, the arrow keys), so a letter they already know can go in its spot first.
 *
 * A cursor of WORD_LENGTH means past the last slot: the row is full, so another
 * letter is ignored and Backspace takes the last one, as in a plain left-to-right
 * game. It only gets there by filling the row.
 */
export type Draft = { letters: string[]; cursor: number };

const PAST_END = WORD_LENGTH;

export const EMPTY_DRAFT: Draft = { letters: Array<string>(WORD_LENGTH).fill(""), cursor: 0 };

export const draftWord = (draft: Draft) => draft.letters.join("");

/** The first empty slot after `from`, else the first one before it, else past the end */
function nextGap(letters: readonly string[], from: number): number {
  for (let i = from + 1; i < WORD_LENGTH; i++) if (!letters[i]) return i;
  for (let i = 0; i < from; i++) if (!letters[i]) return i;
  return PAST_END;
}

/** Fills the cursor's slot and moves on to the next gap, so letters typed around a placed one fill in around it */
export function typeLetter(draft: Draft, letter: string): Draft {
  if (draft.cursor >= PAST_END) return draft;
  const letters = [...draft.letters];
  letters[draft.cursor] = letter;
  return { letters, cursor: nextGap(letters, draft.cursor) };
}

/** Clears the letter under the cursor, or with none there, steps back and clears that slot */
export function backspace(draft: Draft): Draft {
  const at = draft.cursor < PAST_END && draft.letters[draft.cursor] ? draft.cursor : draft.cursor - 1;
  if (at < 0) return draft;
  const letters = [...draft.letters];
  letters[at] = "";
  return { letters, cursor: at };
}

/** The Delete key: clears the slot under the cursor and stays there */
export function clearSlot(draft: Draft): Draft {
  if (draft.cursor >= PAST_END || !draft.letters[draft.cursor]) return draft;
  const letters = [...draft.letters];
  letters[draft.cursor] = "";
  return { letters, cursor: draft.cursor };
}

/** Puts the cursor on a slot: a tap on a tile, Home or End */
export function moveTo(draft: Draft, slot: number): Draft {
  const cursor = Math.min(Math.max(slot, 0), WORD_LENGTH - 1);
  return cursor === draft.cursor ? draft : { ...draft, cursor };
}

/** The arrow keys: one slot left or right, never off the row (left from past the end lands on the last slot) */
export function step(draft: Draft, by: -1 | 1): Draft {
  if (by === 1 && draft.cursor >= WORD_LENGTH - 1) return draft;
  return moveTo(draft, draft.cursor + by);
}
