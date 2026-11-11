import type { Lang } from "./i18n";
import { SITE_URL } from "./site";
import { ALPHABET, VOCAB_LANGS, VOCABS, WORD_LENGTH, type Vocab } from "./words";

/**
 * A word for a friend travels in a link as a seven-character code: ordet.bekirsaliv.dk/?c=4f9k2xw.
 * The code packs the word and what it's played with (English, Danish or Mix), adds a few check
 * bits so a mistyped link is refused instead of turning into a nonsense word, and is scrambled so
 * the word can't be read off the address. It's a disguise, not a secret: this file is public.
 */

export type Linked = { word: string; vocab: Vocab };

/** Every letter a word can have, so one code fits all three vocabularies */
const LETTERS = ALPHABET.mix;
const WORDS = LETTERS.length ** WORD_LENGTH;
// 29^5 words fit in 25 bits, the vocabulary takes two more, and five check bits make it 32
const WORD_BITS = 25;
const CHECK_BITS = 5;
const CODE = /^[0-9a-z]{7}$/;

const check = (payload: number) => Math.imul(payload, 0x9e3779b1) >>> (32 - CHECK_BITS);

// Four Feistel rounds over the two 16-bit halves. Whatever the round function does, the rounds run backwards too.
const KEYS = [0x3a71, 0xc5e9, 0x1d4b, 0x96f3];

function round(half: number, key: number): number {
  const x = Math.imul(half ^ key, 0x9e3b) + (half >>> 3);
  return (x ^ (x >>> 7)) & 0xffff;
}

function scramble(n: number): number {
  let left = n >>> 16;
  let right = n & 0xffff;
  for (const key of KEYS) [left, right] = [right, left ^ round(right, key)];
  return ((left << 16) | right) >>> 0;
}

function unscramble(n: number): number {
  let left = n >>> 16;
  let right = n & 0xffff;
  for (const key of [...KEYS].reverse()) [left, right] = [right ^ round(left, key), left];
  return ((left << 16) | right) >>> 0;
}

/**
 * The words the lists refuse even as guesses (scripts/words/block-*.txt) can't be sent to a friend
 * either. They're kept as hashes so the game doesn't carry them in the open; a test holds them
 * against the files.
 */
const BLOCKED: Record<Lang, ReadonlySet<number>> = {
  da: new Set([0x47ecfc44, 0x5cc84c7a]),
  en: new Set([
    0x2d708b46, 0x41ecf2d2, 0x62bfa028, 0x7eea8f1e, 0x9deacc93, 0xa0a04ce7, 0xb5eaf25b, 0xb6f13699, 0xb7c3c197, 0xbce248a6, 0xc86be502, 0xc9f777d5,
    0xd9eb56dd, 0xdbaaaa0e, 0xdee6e18e, 0xe8e1bb43, 0xf3d4d475, 0xf6a4b84e,
  ]),
};

/** FNV-1a: enough to tell a handful of words from every other one */
function hash(word: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Mix goes by both languages' lists */
export function isBlocked(word: string, vocab: Vocab): boolean {
  const h = hash(word);
  return VOCAB_LANGS[vocab].some((lang) => BLOCKED[lang].has(h));
}

/** The code for a word, or null if it can't be sent: not five of the vocabulary's letters, or a blocked word */
export function encodeChallenge(word: string, vocab: Vocab): string | null {
  const letters = [...word];
  if (letters.length !== WORD_LENGTH || !letters.every((letter) => ALPHABET[vocab].includes(letter)) || isBlocked(word, vocab)) return null;
  const n = letters.reduceRight((sum, letter) => sum * LETTERS.length + LETTERS.indexOf(letter), 0);
  const payload = VOCABS.indexOf(vocab) * 2 ** WORD_BITS + n;
  return scramble(payload * 2 ** CHECK_BITS + check(payload))
    .toString(36)
    .padStart(7, "0");
}

/** The word a code carries, or null for anything that isn't a code the game could have made */
export function decodeChallenge(code: string): Linked | null {
  if (!CODE.test(code)) return null;
  const scrambled = parseInt(code, 36);
  if (scrambled > 0xffffffff) return null;
  const value = unscramble(scrambled);
  const payload = Math.floor(value / 2 ** CHECK_BITS);
  if (value % 2 ** CHECK_BITS !== check(payload)) return null;
  const vocab = VOCABS[Math.floor(payload / 2 ** WORD_BITS)];
  let n = payload % 2 ** WORD_BITS;
  if (!vocab || n >= WORDS) return null;
  let word = "";
  for (let i = 0; i < WORD_LENGTH; i++) {
    word += LETTERS.charAt(n % LETTERS.length);
    n = Math.floor(n / LETTERS.length);
  }
  return [...word].every((letter) => ALPHABET[vocab].includes(letter)) && !isBlocked(word, vocab) ? { word, vocab } : null;
}

/** The link as it's written in a message, without the https:// */
export function challengeLink(code: string): string {
  return `${SITE_URL.replace("https://", "")}/?c=${code}`;
}
