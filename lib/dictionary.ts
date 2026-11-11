import type { Lang } from "./i18n";

/**
 * Where a word can be looked up after a game: Den Danske Ordbog for Danish (it finds the entry
 * for an inflected form too) and Wiktionary's English entry for English.
 */
export function dictionaryUrl(word: string, lang: Lang): string {
  const query = encodeURIComponent(word);
  return lang === "da" ? `https://ordnet.dk/ddo/ordbog?query=${query}` : `https://en.wiktionary.org/wiki/${query}#English`;
}
