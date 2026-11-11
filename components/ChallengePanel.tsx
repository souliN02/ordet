import { Send } from "lucide-react";
import { useId, useState } from "react";
import type { UiStrings } from "@/data/ui";
import { challengeLink, encodeChallenge } from "@/lib/challenge";
import { ALPHABET, WORD_LENGTH, type Vocab } from "@/lib/words";

/** What was typed or pasted, as up to five of the vocabulary's letters */
function clean(text: string, vocab: Vocab): string {
  return [...text.normalize("NFC").toLowerCase()]
    .filter((letter) => ALPHABET[vocab].includes(letter))
    .slice(0, WORD_LENGTH)
    .join("");
}

/**
 * A word of the player's own for a friend. Any five letters will do (the game always takes the
 * answer as a word, in a list or not), so a word outside the list only gets a note to check the
 * spelling. The friend plays it with the words the player has picked: English, Danish or Mix.
 */
export default function ChallengePanel({
  ui,
  vocab,
  accepted,
  onSend,
}: {
  ui: UiStrings;
  vocab: Vocab;
  /** The words that count as guesses, once they've loaded */
  accepted: ReadonlySet<string> | null;
  /** Shares or copies the link for a code, and resolves to what to tell the player, if anything */
  onSend: (code: string) => Promise<string | null>;
}) {
  const [word, setWord] = useState("");
  // Shown here rather than as a toast, which would sit behind the dialog
  const [note, setNote] = useState("");
  const id = useId();
  const text = ui.challenge;
  const whole = [...word].length === WORD_LENGTH;
  const code = whole ? encodeChallenge(word, vocab) : null;
  const warning = !whole ? "" : !code ? text.blocked : accepted && !accepted.has(word) ? text.unknown : "";

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (code) setNote((await onSend(code)) ?? "");
      }}
    >
      <p>{text.intro}</p>
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-bold tracking-wide uppercase">
          {text.word}
        </label>
        <input
          id={id}
          value={word}
          onChange={(e) => {
            setWord(clean(e.target.value, vocab));
            setNote("");
          }}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          translate="no"
          aria-describedby={`${id}-plays ${id}-warning`}
          className="field text-center text-2xl font-bold tracking-[0.3em] uppercase indent-[0.3em]"
        />
        <p id={`${id}-plays`} className="mt-1.5 text-sm text-[var(--muted)]">
          {text.plays[vocab]}
        </p>
        <p id={`${id}-warning`} role="status" className="mt-1 text-sm font-semibold text-[var(--present)]">
          {warning}
        </p>
      </div>
      <button type="submit" disabled={!code} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--correct)] font-bold text-white disabled:opacity-50">
        {text.send}
        <Send aria-hidden className="size-4" />
      </button>
      {/* The link itself, for copying by hand. It doesn't show the word. */}
      <p className="min-h-5 text-center text-sm break-all text-[var(--muted)] select-all" translate="no">
        {code && challengeLink(code)}
      </p>
      <p role="status" className="min-h-5 text-center text-sm font-semibold">
        {note}
      </p>
    </form>
  );
}
