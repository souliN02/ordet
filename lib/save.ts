import type { Game } from "./game";
import { LANGS, type Lang } from "./i18n";
import { EMPTY_STATS, type Stats } from "./stats";
import { ALPHABET, MAX_GUESSES, WORD_LENGTH } from "./words";

export const MODES = ["daily", "unlimited"] as const;
export type Mode = (typeof MODES)[number];
export type Theme = "light" | "dark";

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

/** Each language and mode keeps its own game and statistics */
export type Slot = `${Lang}-${Mode}`;
export const slot = (lang: Lang, mode: Mode): Slot => `${lang}-${mode}`;

export type Settings = {
  mode: Mode;
  hard: boolean;
  /** null follows the system setting */
  theme: Theme | null;
  contrast: boolean;
};

export type Save = {
  settings: Settings;
  games: Partial<Record<Slot, Game>>;
  stats: Partial<Record<Slot, Stats>>;
  /** Unlimited's latest answers per language, so they don't come back soon */
  recent: Partial<Record<Lang, string[]>>;
};

export const SAVE_KEY = "ordet_v1";
export const RECENT_LIMIT = 300;
export const DEFAULT_SETTINGS: Settings = { mode: "daily", hard: false, theme: null, contrast: false };
export const EMPTY_SAVE: Save = { settings: DEFAULT_SETTINGS, games: {}, stats: {}, recent: {} };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isDay = (v: unknown): v is number | null => v === null || Number.isInteger(v);

function isWord(v: unknown, lang: Lang): v is string {
  if (typeof v !== "string") return false;
  const letters = [...v];
  return letters.length === WORD_LENGTH && letters.every((l) => ALPHABET[lang].includes(l));
}

function parseGame(v: unknown, lang: Lang, mode: Mode): Game | undefined {
  if (!isObj(v) || !isWord(v.solution, lang) || !Array.isArray(v.guesses) || typeof v.hard !== "boolean" || !isDay(v.day)) return undefined;
  const guesses = v.guesses.filter((g): g is string => isWord(g, lang));
  if (guesses.length !== v.guesses.length || guesses.length > MAX_GUESSES) return undefined;
  if ((mode === "daily") !== (v.day !== null)) return undefined;
  return { solution: v.solution, guesses, hard: v.hard, day: v.day };
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
    hard: v.hard === true,
    theme: v.theme === "light" || v.theme === "dark" ? v.theme : null,
    contrast: v.contrast === true,
  };
}

/** Saved data comes from the player's browser, so anything malformed is dropped rather than trusted */
export function parseSave(raw: unknown): Save {
  if (!isObj(raw)) return EMPTY_SAVE;
  const save: Save = { settings: parseSettings(raw.settings), games: {}, stats: {}, recent: {} };
  const games = isObj(raw.games) ? raw.games : {};
  const stats = isObj(raw.stats) ? raw.stats : {};
  const recent = isObj(raw.recent) ? raw.recent : {};
  for (const lang of LANGS) {
    for (const mode of MODES) {
      const key = slot(lang, mode);
      const game = parseGame(games[key], lang, mode);
      if (game) save.games[key] = game;
      const s = parseStats(stats[key]);
      if (s) save.stats[key] = s;
    }
    const words = recent[lang];
    if (Array.isArray(words)) save.recent[lang] = words.filter((w): w is string => isWord(w, lang)).slice(-RECENT_LIMIT);
  }
  return save;
}
