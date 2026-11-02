import type { Lang } from "./i18n";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** Danish has three more letters, after z as in the Danish alphabet */
export const ALPHABET: Record<Lang, string> = {
  en: "abcdefghijklmnopqrstuvwxyz",
  da: "abcdefghijklmnopqrstuvwxyzæøå",
};

export type WordList = { answers: readonly string[]; accepted: ReadonlySet<string> };

/** A typed or pressed key as a letter of the language, or null */
export function toLetter(key: string, lang: Lang): string | null {
  const letter = key.normalize("NFC").toLowerCase();
  return letter.length === 1 && ALPHABET[lang].includes(letter) ? letter : null;
}

export function makeWordList(answers: readonly string[], guesses: readonly string[]): WordList {
  return { answers, accepted: new Set([...answers, ...guesses]) };
}

const loading = new Map<Lang, Promise<WordList>>();

/** Each language's list is its own chunk, fetched the first time that language is played */
export function loadWords(lang: Lang): Promise<WordList> {
  let list = loading.get(lang);
  if (!list) {
    list = (lang === "da" ? import("@/data/words/da") : import("@/data/words/en")).then((m) => makeWordList(m.ANSWERS, m.GUESSES));
    // A failed chunk (offline) is retried next time instead of failing forever
    list.catch(() => loading.delete(lang));
    loading.set(lang, list);
  }
  return list;
}

/** A random answer that wasn't one of the recent ones, so Unlimited doesn't repeat itself soon */
export function pickAnswer(answers: readonly string[], recent: readonly string[], random: () => number = Math.random): string {
  const avoid = new Set(recent);
  const fresh = answers.filter((w) => !avoid.has(w));
  const pool = fresh.length > 0 ? fresh : answers;
  return pool[Math.floor(random() * pool.length)] ?? pool[0] ?? "";
}
