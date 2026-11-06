import { RotateCcw, Share2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LANG_NAMES, type UiStrings } from "@/data/ui";
import { status, type Game } from "@/lib/game";
import type { Lang } from "@/lib/i18n";
import type { Mode } from "@/lib/save";
import { currentStreak, winRate, type Stats } from "@/lib/stats";
import Countdown from "./Countdown";

export default function StatsPanel({
  ui,
  lang,
  mode,
  stats,
  today,
  game,
  onShare,
  onNewWord,
}: {
  ui: UiStrings;
  lang: Lang;
  mode: Mode;
  stats: Stats;
  /** Today's puzzle number, to tell whether a daily streak is still alive */
  today: number | null;
  game: Game | null;
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
        {ui.modes[mode]} · {LANG_NAMES[lang].name}
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
          {state === "lost" && (
            <p className="mb-4 text-center font-semibold" translate="no">
              {ui.lost(game.solution)}
            </p>
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
          <p role="status" className="mt-2 min-h-5 text-center text-sm text-[var(--muted)]">
            {note}
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
