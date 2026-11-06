import type { CSSProperties, MouseEvent, RefObject } from "react";
import type { UiStrings } from "@/data/ui";
import { evaluate, type Mark } from "@/lib/game";
import type { Draft } from "@/lib/input";
import { MAX_GUESSES, WORD_LENGTH } from "@/lib/words";

/** See Keyboard: a tap on a tile mustn't leave focus on it, or the next Enter would press the tile instead of guessing */
const keepFocus = (e: MouseEvent) => e.preventDefault();

/**
 * One letter of the game. It's marked translate="no" because a browser translating the page
 * would read a lone letter as a word: into Danish, I became JEG, U became DIG and A became EN.
 */
export function Tile({
  letter,
  mark = null,
  reveal = false,
  index = 0,
  label,
  className = "",
  selected = false,
  onSelect,
}: {
  letter: string | null;
  mark?: Mark | null;
  /** Flip into its color, waiting for the tiles before it */
  reveal?: boolean;
  index?: number;
  label?: string;
  className?: string;
  /** Where the next letter goes */
  selected?: boolean;
  /** Makes the tile a button that puts the cursor on it (the row being typed) */
  onSelect?: () => void;
}) {
  const data = {
    "data-filled": letter ? "" : undefined,
    "data-mark": mark ?? undefined,
    "data-reveal": reveal ? "" : undefined,
    "data-cursor": selected ? "" : undefined,
  };
  const style = reveal ? ({ "--i": index } as CSSProperties) : undefined;
  if (onSelect) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-current={selected || undefined}
        translate="no"
        className={`tile ${className}`}
        style={style}
        onMouseDown={keepFocus}
        onClick={onSelect}
        {...data}
      >
        {letter}
      </button>
    );
  }
  return (
    <div role={label ? "img" : undefined} aria-label={label} translate="no" className={`tile ${className}`} style={style} {...data}>
      {letter}
    </div>
  );
}

/** Six rows of five: the guesses so far, then the row being typed, then empty rows */
export default function Board({
  guesses,
  solution,
  draft,
  showCursor,
  revealing,
  rowRefs,
  ui,
  onSelect,
}: {
  guesses: readonly string[];
  solution: string;
  /** The row being typed, or null when there's nothing to type (still loading, or the game is over) */
  draft: Draft | null;
  /** Hidden while a guess is revealed or a dialog is open */
  showCursor: boolean;
  revealing: number | null;
  rowRefs: RefObject<(HTMLDivElement | null)[]>;
  ui: UiStrings;
  onSelect: (slot: number) => void;
}) {
  return (
    <div className="board" role="group" aria-label={ui.board}>
      {Array.from({ length: MAX_GUESSES }, (_, r) => {
        const guess = guesses[r];
        const typing = !guess && draft !== null && r === guesses.length;
        const letters = guess ? [...guess] : typing ? draft.letters : [];
        const marks = guess ? evaluate(guess, solution) : null;
        return (
          <div
            key={r}
            ref={(el) => {
              rowRefs.current[r] = el;
            }}
            className="board-row"
            role="group"
            aria-label={ui.row(r + 1)}
          >
            {Array.from({ length: WORD_LENGTH }, (_, i) => {
              const letter = letters[i] || null;
              const mark = marks?.[i] ?? null;
              return (
                <Tile
                  key={i}
                  letter={letter}
                  mark={mark}
                  reveal={r === revealing}
                  index={i}
                  label={ui.tile(i + 1, letter, mark)}
                  selected={typing && showCursor && draft.cursor === i}
                  onSelect={typing ? () => onSelect(i) : undefined}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
