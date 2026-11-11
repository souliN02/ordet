import { dailyAnswer, mixDailyAnswer } from "./daily";
import { LANGS, type Lang } from "./i18n";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/**
 * What a game takes its words from: one language, or Mix, where the answer can be
 * English or Danish and working out which is part of the puzzle.
 */
export const VOCABS = ["en", "da", "mix"] as const;
export type Vocab = (typeof VOCABS)[number];

export function isVocab(value: unknown): value is Vocab {
  return typeof value === "string" && (VOCABS as readonly string[]).includes(value);
}

/** The languages a vocabulary takes its words from */
export const VOCAB_LANGS: Record<Vocab, readonly Lang[]> = { en: ["en"], da: ["da"], mix: LANGS };

const DANISH = "abcdefghijklmnopqrstuvwxyzæøå";

/** Danish has three more letters, after z as in the Danish alphabet. Mix needs them all. */
export const ALPHABET: Record<Vocab, string> = { en: "abcdefghijklmnopqrstuvwxyz", da: DANISH, mix: DANISH };

export type WordList = { answers: readonly string[]; accepted: ReadonlySet<string> };

/** The words in play: one language's list, or both in Mix, and every word that counts as a guess */
export type Vocabulary = { lists: Partial<Record<Lang, WordList>>; accepted: ReadonlySet<string> };

/** A typed or pressed key as a letter of the vocabulary, or null */
export function toLetter(key: string, vocab: Vocab): string | null {
  const letter = key.normalize("NFC").toLowerCase();
  return letter.length === 1 && ALPHABET[vocab].includes(letter) ? letter : null;
}

export function makeWordList(answers: readonly string[], guesses: readonly string[]): WordList {
  return { answers, accepted: new Set([...answers, ...guesses]) };
}

export function makeVocabulary(lists: Partial<Record<Lang, WordList>>): Vocabulary {
  const all = LANGS.flatMap((lang) => lists[lang] ?? []);
  const [only] = all;
  return { lists, accepted: only && all.length === 1 ? only.accepted : new Set(all.flatMap((list) => [...list.accepted])) };
}

/** The languages in play that have the word: both for SPORT in Mix, none for a friend's made-up word */
export function wordLangs(vocabulary: Vocabulary, word: string): Lang[] {
  return LANGS.filter((lang) => vocabulary.lists[lang]?.accepted.has(word));
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

const vocabularies = new Map<Vocab, Promise<Vocabulary>>();

/** A vocabulary's lists, fetched together. Mix is put together once and kept. */
export function loadVocabulary(vocab: Vocab): Promise<Vocabulary> {
  let vocabulary = vocabularies.get(vocab);
  if (!vocabulary) {
    const langs = VOCAB_LANGS[vocab];
    vocabulary = Promise.all(langs.map(loadWords)).then((loaded) => {
      const lists: Partial<Record<Lang, WordList>> = {};
      langs.forEach((lang, i) => {
        lists[lang] = loaded[i];
      });
      return makeVocabulary(lists);
    });
    vocabulary.catch(() => vocabularies.delete(vocab));
    vocabularies.set(vocab, vocabulary);
  }
  return vocabulary;
}

/** A random answer that wasn't one of the recent ones, so Unlimited doesn't repeat itself soon */
export function pickAnswer(answers: readonly string[], recent: readonly string[], random: () => number = Math.random): string {
  const avoid = new Set(recent);
  const fresh = answers.filter((w) => !avoid.has(w));
  const pool = fresh.length > 0 ? fresh : answers;
  return pool[Math.floor(random() * pool.length)] ?? pool[0] ?? "";
}

/** A random answer from a vocabulary. Mix flips a coin for the language first, so neither one is the safer bet. */
export function pickFrom(vocabulary: Vocabulary, recent: readonly string[], random: () => number = Math.random): string {
  const lists = LANGS.flatMap((lang) => vocabulary.lists[lang] ?? []);
  const list = lists.length > 1 ? lists[Math.min(lists.length - 1, Math.floor(random() * lists.length))] : lists[0];
  return pickAnswer(list?.answers ?? [], recent, random);
}

/** The day's word from Ordet's own schedule */
export function dailyWord(vocabulary: Vocabulary, day: number): string {
  const { en, da } = vocabulary.lists;
  if (en && da) return mixDailyAnswer({ en: en.answers, da: da.answers }, day);
  return dailyAnswer((en ?? da)?.answers ?? [""], day);
}
