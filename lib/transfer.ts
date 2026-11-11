import { parseSave, type Save, type Settings } from "./save";

/**
 * Statistics live in the browser, so a new phone starts from nothing. A transfer code carries them
 * over by copy and paste: the statistics and the look-and-feel settings as compact JSON, in base64
 * the way a link would carry it, behind a tag and a checksum that catch a code cut short on the way.
 * The games in progress stay where they are.
 */

export type Transfer = { settings: Pick<Settings, "hard" | "theme" | "contrast">; stats: Save["stats"] };

const TAG = "ORDET1";
const SHAPE = /^ORDET1([0-9a-z]{7})([A-Za-z0-9_-]+)$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** FNV-1a of the code's body, as seven characters */
function checksum(body: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) h = Math.imul(h ^ body.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36).padStart(7, "0");
}

export function exportCode(save: Save): string {
  const { hard, theme, contrast } = save.settings;
  const stats: Record<string, (number | null)[]> = {};
  for (const [key, s] of Object.entries(save.stats)) {
    if (s && s.played > 0) stats[key] = [s.played, s.wins, s.streak, s.best, s.lastDay, ...s.guesses];
  }
  const body = btoa(JSON.stringify({ p: [hard, theme, contrast], s: stats }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return TAG + checksum(body) + body;
}

/** What a pasted code carries, or null if it isn't a whole code. The contents are checked like any saved data. */
export function importCode(text: string): Transfer | null {
  const [, sum, body] = SHAPE.exec(text.replace(/\s+/g, "")) ?? [];
  if (!sum || !body || checksum(body) !== sum) return null;
  let data: unknown;
  try {
    data = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
  if (!isObj(data) || !Array.isArray(data.p) || !isObj(data.s)) return null;
  const [hard, theme, contrast] = data.p as unknown[];
  const stats: Record<string, unknown> = {};
  for (const [key, row] of Object.entries(data.s)) {
    if (!Array.isArray(row)) continue;
    const [played, wins, streak, best, lastDay, ...guesses] = row as unknown[];
    stats[key] = { played, wins, streak, best, lastDay, guesses };
  }
  const { settings, stats: checked } = parseSave({ settings: { hard, theme, contrast }, stats });
  return { settings: { hard: settings.hard, theme: settings.theme, contrast: settings.contrast }, stats: checked };
}

/** The save after a transfer: its statistics replace the ones here, and nothing else moves */
export function applyTransfer(save: Save, transfer: Transfer): Save {
  return { ...save, settings: { ...save.settings, ...transfer.settings }, stats: transfer.stats };
}
