import { useId, useState } from "react";
import type { UiStrings } from "@/data/ui";
import type { Settings } from "@/lib/save";
import { AUTHOR, SOURCE_URL } from "@/lib/site";
import { importCode, type Transfer } from "@/lib/transfer";

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

/**
 * Statistics to another device and back: a code to copy here, and a field to paste one into.
 * A code that would overwrite statistics already on this device is asked about first.
 */
function Move({ ui, hasStats, onCopy, onImport }: { ui: UiStrings; hasStats: boolean; onCopy: () => Promise<boolean>; onImport: (transfer: Transfer) => void }) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<Transfer | null>(null);
  // Shown here rather than as a toast, which would sit behind the dialog
  const [note, setNote] = useState("");
  const id = useId();
  const text = ui.transfer;
  const outline = "rounded-full border-2 border-[var(--tile-filled)] px-4 py-1.5 text-sm font-bold";

  const bring = (transfer: Transfer) => {
    onImport(transfer);
    setPending(null);
    setCode("");
    setNote(text.done);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="border-b border-[var(--line)] py-3">
      <h3 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h3>
      <p className="text-sm text-[var(--muted)]">{text.hint}</p>
      <button type="button" className={`${outline} mt-3`} onClick={async () => setNote((await onCopy()) ? text.copied : text.copyFailed)}>
        {text.copy}
      </button>
      {/* The field and its button share a row at every width: on a phone a wrapped button looked like it belonged to nothing */}
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const transfer = importCode(code);
          if (!transfer) setNote(text.invalid);
          else if (hasStats) {
            setPending(transfer);
            setNote("");
          } else bring(transfer);
        }}
      >
        <label htmlFor={`${id}-code`} className="sr-only">
          {text.paste}
        </label>
        <input
          id={`${id}-code`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setPending(null);
            setNote("");
          }}
          placeholder={text.paste}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          translate="no"
          className="field min-w-0 flex-1 py-1.5 text-base"
        />
        <button type="submit" disabled={!code.trim() || pending !== null} className={`${outline} flex-none disabled:opacity-50`}>
          {text.import}
        </button>
      </form>
      {pending && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="basis-full text-sm font-semibold text-[var(--present)]">{text.confirm}</p>
          <button type="button" className="rounded-full bg-[var(--correct)] px-4 py-1.5 text-sm font-bold text-white" onClick={() => bring(pending)}>
            {text.replace}
          </button>
          <button type="button" className={outline} onClick={() => setPending(null)}>
            {text.cancel}
          </button>
        </div>
      )}
      <p role="status" className="mt-2 min-h-5 text-sm font-semibold">
        {note}
      </p>
    </section>
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
  hasStats,
  onHard,
  onDark,
  onContrast,
  onCopyCode,
  onImport,
  onNews,
}: {
  ui: UiStrings;
  settings: Settings;
  /** A game is under way, so hard mode can't be switched on until the next one */
  hardLocked: boolean;
  dark: boolean;
  /** There are statistics on this device that an imported code would replace */
  hasStats: boolean;
  onHard: (on: boolean) => void;
  onDark: (on: boolean) => void;
  onContrast: (on: boolean) => void;
  /** Copies this device's transfer code, and resolves to whether that worked */
  onCopyCode: () => Promise<boolean>;
  onImport: (transfer: Transfer) => void;
  /** Opens "What's new" again */
  onNews: () => void;
}) {
  return (
    <div>
      <div className="-mt-3">
        <Toggle label={ui.settings.hard} hint={ui.settings.hardHint} locked={hardLocked ? ui.settings.hardLocked : null} checked={settings.hard} onChange={onHard} />
        <Toggle label={ui.settings.dark} checked={dark} onChange={onDark} />
        <Toggle label={ui.settings.contrast} hint={ui.settings.contrastHint} checked={settings.contrast} onChange={onContrast} />
        <Move ui={ui} hasStats={hasStats} onCopy={onCopyCode} onImport={onImport} />
      </div>
      <div className="mt-5 space-y-1.5 text-sm text-[var(--muted)]">
        <p>
          {ui.settings.madeBy} <Link href={AUTHOR.url}>{AUTHOR.name}</Link> · <Link href={SOURCE_URL}>{ui.settings.source}</Link> ·{" "}
          <button type="button" onClick={onNews} className="underline underline-offset-2 hover:text-[var(--fg)]">
            {ui.news.title}
          </button>
        </p>
        <p>
          {ui.settings.danishWords} <Link href="https://dsl.dk">Det Danske Sprog- og Litteraturselskab</Link>.
        </p>
      </div>
    </div>
  );
}
