import { ChartNoAxesColumn, CircleHelp, Flame, Settings, Swords } from "lucide-react";
import { useId, type MouseEvent, type ReactNode } from "react";
import { VOCAB_NAMES, type UiStrings } from "@/data/ui";
import type { Mark } from "@/lib/game";
import { MODES, type Mode } from "@/lib/save";
import { VOCABS, type Vocab } from "@/lib/words";

/** The dialogs. The news has no button here: it opens by itself once, and from the settings after that. */
export type Panel = "help" | "challenge" | "stats" | "settings" | "news";

/** See Keyboard: a click on the header mustn't leave focus on a button that the next Enter would press */
const keepFocus = (e: MouseEvent) => e.preventDefault();

const LOGO: [string, Mark][] = [
  ["o", "correct"],
  ["r", "present"],
  ["d", "absent"],
  ["e", "correct"],
  ["t", "correct"],
];

function IconButton({ label, title = label, describedBy, onClick, children }: { label: string; title?: string; describedBy?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={describedBy}
      title={title}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="relative grid size-10 place-items-center rounded-full hover:bg-[var(--line)]"
    >
      {children}
    </button>
  );
}

/** Pill buttons in a track, the current one raised. On the narrowest phones they sit a little tighter so three languages fit. */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  className = "",
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  render: (option: T) => { text: string; title?: string; lang?: string };
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex rounded-full bg-[var(--track)] p-0.5 ${className}`}>
      {options.map((option) => {
        const { text, title, lang } = render(option);
        const on = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            title={title}
            lang={lang}
            onMouseDown={keepFocus}
            onClick={() => onChange(option)}
            className={`flex-1 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors max-[399px]:px-2 max-[399px]:text-[13px] max-[339px]:px-1.5 max-[339px]:text-xs ${
              on ? "bg-[var(--pill)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export default function Header({
  ui,
  vocab,
  mode,
  ready,
  streak,
  lit,
  onVocab,
  onMode,
  onOpen,
}: {
  ui: UiStrings;
  vocab: Vocab;
  /** Null while a friend's word is being played: it belongs to neither mode */
  mode: Mode | null;
  /** Until the player's language and mode are known, the switches show nothing picked */
  ready: boolean;
  /** The current streak, shown on the statistics button once there is one */
  streak: number;
  /** A daily streak is only lit once today's word is solved; until then it's still to be kept */
  lit: boolean;
  onVocab: (vocab: Vocab) => void;
  onMode: (mode: Mode) => void;
  onOpen: (panel: Panel) => void;
}) {
  const streakId = useId();
  return (
    <header className="border-b border-[var(--line)]">
      <div className="mx-auto grid h-14 max-w-[500px] grid-cols-[1fr_auto_1fr] items-center px-2">
        <div className="flex items-center gap-1">
          <IconButton label={ui.buttons.help} onClick={() => onOpen("help")}>
            <CircleHelp aria-hidden className="size-6" />
          </IconButton>
          <IconButton label={ui.buttons.challenge} onClick={() => onOpen("challenge")}>
            <Swords aria-hidden className="size-6" />
          </IconButton>
        </div>
        {/* The name and its letters aren't translated (see Tile) */}
        <h1 className="flex gap-[3px]" translate="no">
          <span className="sr-only">{ui.title}</span>
          {LOGO.map(([letter, mark]) => (
            <span key={letter} aria-hidden className="tile tile-xs" data-mark={mark}>
              {letter}
            </span>
          ))}
        </h1>
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label={ui.buttons.stats}
            title={streak > 0 ? `${ui.buttons.stats} · ${ui.streak.label(streak)}` : ui.buttons.stats}
            describedBy={streak > 0 ? streakId : undefined}
            onClick={() => onOpen("stats")}
          >
            <ChartNoAxesColumn aria-hidden className="size-6" />
            {streak > 0 && (
              // Keyed by the number, so the badge pops again each time the streak grows
              <span key={streak} id={streakId} className="streak" data-lit={lit ? "" : undefined}>
                <Flame aria-hidden className="size-2.5" />
                <span aria-hidden>{streak}</span>
                <span className="sr-only">{ui.streak.label(streak)}</span>
              </span>
            )}
          </IconButton>
          <IconButton label={ui.buttons.settings} onClick={() => onOpen("settings")}>
            <Settings aria-hidden className="size-6" />
          </IconButton>
        </div>
      </div>
      <div className="mx-auto flex max-w-[500px] items-center justify-center gap-2 px-3 pb-2.5">
        <Segmented
          label={ui.modes.label}
          options={MODES}
          value={ready ? mode : null}
          onChange={onMode}
          render={(m) => ({ text: ui.modes[m] })}
          className="max-w-[280px] flex-1"
        />
        <Segmented
          label={ui.language}
          options={VOCABS}
          value={ready ? vocab : null}
          onChange={onVocab}
          render={(v) => ({ text: VOCAB_NAMES[v].code, title: v === "mix" ? ui.mix.title : VOCAB_NAMES[v].name, lang: v === "mix" ? undefined : v })}
        />
      </div>
    </header>
  );
}
