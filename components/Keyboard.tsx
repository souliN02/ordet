import { Delete } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { KEYBOARDS, type UiStrings } from "@/data/ui";
import type { Mark } from "@/lib/game";
import type { Vocab } from "@/lib/words";

/** A mouse click mustn't move focus to the key, or the next Enter would press that key again instead of guessing */
const keepFocus = (e: MouseEvent) => e.preventDefault();

/** Not translated, as with the tiles (see Tile) */
function Key({ onPress, mark, wide, label, children }: { onPress: () => void; mark?: Mark; wide?: boolean; label?: string; children: ReactNode }) {
  return (
    <button type="button" className="key" data-mark={mark} data-wide={wide ? "" : undefined} aria-label={label} translate="no" onMouseDown={keepFocus} onClick={onPress}>
      {children}
    </button>
  );
}

export default function Keyboard({
  vocab,
  marks,
  ui,
  onLetter,
  onEnter,
  onBackspace,
}: {
  /** Mix gets the Danish layout: it has every letter, and so gives nothing away */
  vocab: Vocab;
  marks: ReadonlyMap<string, Mark>;
  ui: UiStrings;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}) {
  const rows = KEYBOARDS[vocab];
  // The English middle row is shorter, so it's centered by half a key on each side, as on a real keyboard
  const indent = rows[1]!.length < rows[0]!.length ? <div className="flex-[0.5_1_0]" /> : null;
  return (
    <div className="mx-auto flex w-full max-w-[500px] flex-col gap-2 px-2 pb-2" role="group" aria-label={ui.keys.label}>
      {rows.map((row, r) => (
        <div key={row} className="flex gap-1.5">
          {r === 1 && indent}
          {r === 2 && (
            <Key wide onPress={onEnter}>
              {ui.keys.enter}
            </Key>
          )}
          {[...row].map((letter) => {
            const mark = marks.get(letter);
            return (
              <Key key={letter} mark={mark} label={mark ? `${letter.toUpperCase()}, ${ui.marks[mark]}` : undefined} onPress={() => onLetter(letter)}>
                {letter}
              </Key>
            );
          })}
          {r === 2 && (
            <Key wide label={ui.keys.backspace} onPress={onBackspace}>
              <Delete aria-hidden className="size-6" />
            </Key>
          )}
          {r === 1 && indent}
        </div>
      ))}
    </div>
  );
}
