import { ChartNoAxesColumn, CircleHelp, Settings } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { LANG_NAMES, type UiStrings } from "@/data/ui";
import type { Mark } from "@/lib/game";
import { LANGS, type Lang } from "@/lib/i18n";
import { MODES, type Mode } from "@/lib/save";

export type Panel = "help" | "stats" | "settings";

/** See Keyboard: a click on the header mustn't leave focus on a button that the next Enter would press */
const keepFocus = (e: MouseEvent) => e.preventDefault();

const LOGO: [string, Mark][] = [
  ["o", "correct"],
  ["r", "present"],
  ["d", "absent"],
  ["e", "correct"],
  ["t", "correct"],
];

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onMouseDown={keepFocus} onClick={onClick} className="grid size-10 place-items-center rounded-full hover:bg-[var(--line)]">
      {children}
    </button>
  );
}

/** Two pill buttons in a track, the current one raised */
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
            className={`flex-1 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors ${
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
  lang,
  mode,
  ready,
  onLang,
  onMode,
  onOpen,
}: {
  ui: UiStrings;
  lang: Lang;
  mode: Mode;
  /** Until the player's language and mode are known, the switches show nothing picked */
  ready: boolean;
  onLang: (lang: Lang) => void;
  onMode: (mode: Mode) => void;
  onOpen: (panel: Panel) => void;
}) {
  return (
    <header className="border-b border-[var(--line)]">
      <div className="mx-auto grid h-14 max-w-[500px] grid-cols-[1fr_auto_1fr] items-center px-2">
        <div className="flex items-center gap-1">
          <IconButton label={ui.buttons.help} onClick={() => onOpen("help")}>
            <CircleHelp aria-hidden className="size-6" />
          </IconButton>
        </div>
        <h1 className="flex gap-[3px]">
          <span className="sr-only">{ui.title}</span>
          {LOGO.map(([letter, mark]) => (
            <span key={letter} aria-hidden className="tile tile-xs" data-mark={mark}>
              {letter}
            </span>
          ))}
        </h1>
        <div className="flex items-center justify-end gap-1">
          <IconButton label={ui.buttons.stats} onClick={() => onOpen("stats")}>
            <ChartNoAxesColumn aria-hidden className="size-6" />
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
          options={LANGS}
          value={ready ? lang : null}
          onChange={onLang}
          render={(l) => ({ text: LANG_NAMES[l].code, title: LANG_NAMES[l].name, lang: l })}
        />
      </div>
    </header>
  );
}
