import { decodeChallenge } from "./challenge";
import { MAX_HINTS, type Game } from "./game";
import { EMPTY_STATS, type Stats } from "./stats";
import { ALPHABET, MAX_GUESSES, VOCABS, WORD_LENGTH, type Vocab } from "./words";

export const MODES = ["daily", "unlimited"] as const;
export type Mode = (typeof MODES)[number];
export type Theme = "light" | "dark";

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

/** Each vocabulary (English, Danish, Mix) and mode keeps its own game and statistics */
export type Slot = `${Vocab}-${Mode}`;
export const slot = (vocab: Vocab, mode: Mode): Slot => `${vocab}-${mode}`;

export type Settings = {
  mode: Mode;
  /** Mix is on: the words come from both languages, whichever one the interface is in */
  mix: boolean;
  hard: boolean;
  /** null follows the system setting */
  theme: Theme | null;
  contrast: boolean;
};

/** A word a friend sent as a link: the link's code, what it's played with, and the game */
export type Challenge = { code: string; vocab: Vocab; game: Game };

export type Save = {
  settings: Settings;
  games: Partial<Record<Slot, Game>>;
  stats: Partial<Record<Slot, Stats>>;
  /** Unlimited's latest answers per vocabulary, so they don't come back soon */
  recent: Partial<Record<Vocab, string[]>>;
  /** The latest word from a friend's link. It keeps no statistics. */
  challenge?: Challenge;
  /** The latest "What's new" the player has been shown (see lib/news.ts). A save from before there was any has seen none. */
  news: number;
};

export const SAVE_KEY = "ordet_v1";
export const RECENT_LIMIT = 300;
export const DEFAULT_SETTINGS: Settings = { mode: "daily", mix: false, hard: false, theme: null, contrast: false };
export const EMPTY_SAVE: Save = { settings: DEFAULT_SETTINGS, games: {}, stats: {}, recent: {}, news: 0 };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isDay = (v: unknown): v is number | null => v === null || Number.isInteger(v);

function isWord(v: unknown, vocab: Vocab): v is string {
  if (typeof v !== "string") return false;
  const letters = [...v];
  return letters.length === WORD_LENGTH && letters.every((l) => ALPHABET[vocab].includes(l));
}

/** Saves from before there were hints have none, and a Daily never has any */
function parseHints(v: unknown, mode: Mode): number[] {
  if (mode === "daily" || !Array.isArray(v)) return [];
  const slots = v.filter((h): h is number => Number.isInteger(h) && h >= 0 && h < WORD_LENGTH);
  return [...new Set(slots)].slice(0, MAX_HINTS);
}

function parseGame(v: unknown, vocab: Vocab, mode: Mode): Game | undefined {
  if (!isObj(v) || !isWord(v.solution, vocab) || !Array.isArray(v.guesses) || typeof v.hard !== "boolean" || !isDay(v.day)) return undefined;
  const guesses = v.guesses.filter((g): g is string => isWord(g, vocab));
  if (guesses.length !== v.guesses.length || guesses.length > MAX_GUESSES) return undefined;
  if ((mode === "daily") !== (v.day !== null)) return undefined;
  return { solution: v.solution, guesses, hard: v.hard, day: v.day, hints: parseHints(v.hints, mode) };
}

/** A friend's word is only kept while its code still says the same word */
function parseChallenge(v: unknown): Challenge | undefined {
  if (!isObj(v) || typeof v.code !== "string") return undefined;
  const linked = decodeChallenge(v.code);
  const game = linked && parseGame(v.game, linked.vocab, "unlimited");
  return linked && game && game.solution === linked.word ? { code: v.code, vocab: linked.vocab, game } : undefined;
}

function parseStats(v: unknown): Stats | undefined {
  if (!isObj(v) || !isCount(v.played) || !isCount(v.wins) || !isCount(v.streak) || !isCount(v.best) || !isDay(v.lastDay)) return undefined;
  // The panel counts the games that weren't solved as played minus wins
  if (v.wins > v.played) return undefined;
  const guesses = Array.isArray(v.guesses) && v.guesses.length === MAX_GUESSES && v.guesses.every(isCount) ? (v.guesses as number[]) : EMPTY_STATS.guesses;
  return { played: v.played, wins: v.wins, streak: v.streak, best: v.best, guesses: [...guesses], lastDay: v.lastDay };
}

function parseSettings(v: unknown): Settings {
  if (!isObj(v)) return DEFAULT_SETTINGS;
  return {
    mode: isMode(v.mode) ? v.mode : DEFAULT_SETTINGS.mode,
    mix: v.mix === true,
    hard: v.hard === true,
    theme: v.theme === "light" || v.theme === "dark" ? v.theme : null,
    contrast: v.contrast === true,
  };
}

/** Saved data comes from the player's browser, so anything malformed is dropped rather than trusted */
export function parseSave(raw: unknown): Save {
  if (!isObj(raw)) return EMPTY_SAVE;
  const save: Save = { settings: parseSettings(raw.settings), games: {}, stats: {}, recent: {}, news: isCount(raw.news) ? raw.news : 0 };
  const games = isObj(raw.games) ? raw.games : {};
  const stats = isObj(raw.stats) ? raw.stats : {};
  const recent = isObj(raw.recent) ? raw.recent : {};
  for (const vocab of VOCABS) {
    for (const mode of MODES) {
      const key = slot(vocab, mode);
      const game = parseGame(games[key], vocab, mode);
      if (game) save.games[key] = game;
      const s = parseStats(stats[key]);
      if (s) save.stats[key] = s;
    }
    const words = recent[vocab];
    if (Array.isArray(words)) save.recent[vocab] = words.filter((w): w is string => isWord(w, vocab)).slice(-RECENT_LIMIT);
  }
  const challenge = parseChallenge(raw.challenge);
  if (challenge) save.challenge = challenge;
  return save;
}
