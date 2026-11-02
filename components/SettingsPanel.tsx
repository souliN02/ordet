import { useId } from "react";
import type { UiStrings } from "@/data/ui";
import type { Settings } from "@/lib/save";
import { AUTHOR, SOURCE_URL } from "@/lib/site";

/** A switch, or with `locked` a switch that can't be turned on right now, saying why */
function Toggle({ label, hint, locked, checked, onChange }: { label: string; hint?: string; locked?: string | null; checked: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  const note = locked ?? hint;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-3">
      <div>
        <p id={`${id}-label`} className="font-semibold">
          {label}
        </p>
        {note && (
          <p id={`${id}-hint`} className={`text-sm ${locked ? "font-semibold text-[var(--present)]" : "text-[var(--muted)]"}`}>
            {note}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={locked ? true : undefined}
        aria-labelledby={`${id}-label`}
        aria-describedby={note ? `${id}-hint` : undefined}
        onClick={() => {
          if (!locked) onChange(!checked);
        }}
        className={`switch ${locked ? "cursor-not-allowed opacity-50" : ""}`}
      />
    </div>
  );
}

/** Links leave the game in a new tab: inside the portfolio's Internet Explorer they'd otherwise open in the frame */
function Link({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--fg)]">
      {children}
    </a>
  );
}

export default function SettingsPanel({
  ui,
  settings,
  hardLocked,
  dark,
  onHard,
  onDark,
  onContrast,
}: {
  ui: UiStrings;
  settings: Settings;
  /** A game is under way, so hard mode can't be switched on until the next one */
  hardLocked: boolean;
  dark: boolean;
  onHard: (on: boolean) => void;
  onDark: (on: boolean) => void;
  onContrast: (on: boolean) => void;
}) {
  return (
    <div>
      <div className="-mt-3">
        <Toggle label={ui.settings.hard} hint={ui.settings.hardHint} locked={hardLocked ? ui.settings.hardLocked : null} checked={settings.hard} onChange={onHard} />
        <Toggle label={ui.settings.dark} checked={dark} onChange={onDark} />
        <Toggle label={ui.settings.contrast} hint={ui.settings.contrastHint} checked={settings.contrast} onChange={onContrast} />
      </div>
      <div className="mt-5 space-y-1.5 text-sm text-[var(--muted)]">
        <p>
          {ui.settings.madeBy} <Link href={AUTHOR.url}>{AUTHOR.name}</Link> · <Link href={SOURCE_URL}>{ui.settings.source}</Link>
        </p>
        <p>
          {ui.settings.danishWords} <Link href="https://dsl.dk">Det Danske Sprog- og Litteraturselskab</Link>.
        </p>
      </div>
    </div>
  );
}
