import { RotateCcw, Share2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { VOCAB_NAMES, type UiStrings } from "@/data/ui";
import { status, type Game } from "@/lib/game";
import type { Mode } from "@/lib/save";
import { currentStreak, winRate, type Stats } from "@/lib/stats";
import type { Vocab } from "@/lib/words";
import Countdown from "./Countdown";

export default function StatsPanel({
  ui,
  vocab,
  mode,
  stats,
  today,
  game,
  line,
  meaning,
  shareHint,
  onShare,
  onNewWord,
}: {
  ui: UiStrings;
  vocab: Vocab;
  mode: Mode;
  stats: Stats;
  /** Today's puzzle number, to tell whether a daily streak is still alive */
  today: number | null;
  /** The game that just ended, or null while one is being played */
  game: Game | null;
  /** What there is to say about the word: what it was after a loss, which language it was in Mix */
  line: string | null;
  /** Where to look the word up */
  meaning: { href: string; label: string } | null;
  /** A word under the buttons about what the shared result carries */
  shareHint: string | null;
  /** Resolves to what to tell the player ("Result copied"), if anything */
  onShare: () => Promise<string | null>;
  onNewWord: () => void;
}) {
  // Shown here rather than as a toast, which would sit behind the dialog
  const [note, setNote] = useState("");
  const state = game ? status(game) : "playing";
  const unsolved = stats.played - stats.wins;
  const most = Math.max(1, ...stats.guesses, unsolved);
  const numbers: [number, string][] = [
    [stats.played, ui.stats.played],
    [winRate(stats), ui.stats.winRate],
    [currentStreak(stats, mode === "daily" ? today : null), ui.stats.streak],
    [stats.best, ui.stats.best],
  ];

  return (
    <div>
      <p className="-mt-3 mb-4 text-sm text-[var(--muted)]">
        {ui.modes[mode]} · {VOCAB_NAMES[vocab].name}
      </p>

      <dl className="grid grid-cols-4 gap-2 text-center">
        {numbers.map(([value, label]) => (
          // Reversed so the label follows the number on screen, packed to the top so numbers line up when a label wraps
          <div key={label} className="flex flex-col-reverse justify-end">
            <dt className="text-xs leading-tight">{label}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-6 mb-2 text-sm font-bold tracking-wide uppercase">{ui.stats.distribution}</h3>
      {stats.played === 0 ? (
        <p className="text-sm text-[var(--muted)]">{ui.stats.none}</p>
      ) : (
        <ol className="space-y-1">
          {stats.guesses.map((count, i) => (
            <Row key={i} label={i + 1} count={count} most={most} color={state === "won" && game?.guesses.length === i + 1 ? "var(--correct)" : "var(--absent)"} />
          ))}
          {/* The games that weren't solved, marked X as in a shared result */}
          <Row
            label={
              <>
                <span aria-hidden>X</span>
                <span className="sr-only">{ui.stats.unsolved}</span>
              </>
            }
            count={unsolved}
            most={most}
            color={state === "lost" ? "var(--present)" : "var(--absent)"}
          />
        </ol>
      )}

      {game && state !== "playing" && (
        <div className="mt-6 border-t border-[var(--line)] pt-5">
          {(line || meaning) && (
            // Neither names the word in a way a translation should touch (see Tile)
            <div className="mb-4 space-y-1 text-center" translate="no">
              {line && <p className="font-semibold">{line}</p>}
              {meaning && (
                <p className="text-sm">
                  <a href={meaning.href} target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] underline underline-offset-2 hover:text-[var(--fg)]">
                    {meaning.label}
                  </a>
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            {mode === "daily" ? (
              <div className="flex-1 text-center">
                <p className="text-xs font-bold tracking-wide uppercase">{ui.stats.next}</p>
                <Countdown className="text-2xl font-semibold tabular-nums" />
              </div>
            ) : (
              <button type="button" onClick={onNewWord} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-[var(--tile-filled)] font-bold">
                {ui.newWord}
                <RotateCcw aria-hidden className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={async () => setNote((await onShare()) ?? "")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--correct)] font-bold text-white"
            >
              {ui.stats.share}
              <Share2 aria-hidden className="size-4" />
            </button>
          </div>
          {/* The copied note takes the hint's place, so the dialog doesn't grow when it comes */}
          <p role="status" className="mt-2 min-h-5 text-center text-sm text-[var(--muted)]">
            {note || shareHint}
          </p>
        </div>
      )}
    </div>
  );
}

/** A line of the guess distribution, its bar as long as its share of the most common result */
function Row({ label, count, most, color }: { label: ReactNode; count: number; most: number; color: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="w-3 tabular-nums">{label}</span>
      <span className="flex-1">
        <span className="flex min-w-7 justify-end rounded-sm px-2 py-0.5 font-semibold text-white tabular-nums" style={{ width: `${(count / most) * 100}%`, background: color }}>
          {count}
        </span>
      </span>
    </li>
  );
}
