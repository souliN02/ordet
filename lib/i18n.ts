/**
 * Ordet plays in English and Danish. The language picks both the words and the
 * interface text, and each language keeps its own games and statistics.
 */

export const LANGS = ["en", "da"] as const;
export type Lang = (typeof LANGS)[number];

/** The player's own pick (localStorage) */
export const LANG_KEY = "ordet_lang";

export const LOCALES: Record<Lang, string> = { en: "en-US", da: "da-DK" };

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/** A ?lang= link wins, then the player's own pick, then the first browser language the game speaks */
export function pickLang({ search = "", saved = null, browser = [] }: { search?: string; saved?: string | null; browser?: readonly string[] }): Lang {
  const query = new URLSearchParams(search).get("lang")?.trim().toLowerCase();
  if (isLang(query)) return query;
  if (isLang(saved)) return saved;
  for (const tag of browser) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

/**
 * pickLang as an inline script for the layout's <head>, so <html lang> is right before anything
 * is drawn. Browsers decide a page's language from that first version, which the server renders
 * in English: a Danish game was taken for English and offered a translation into Danish.
 */
export const LANG_SCRIPT = `try{var l=${JSON.stringify(LANGS)},p=[],q=new URLSearchParams(location.search).get("lang"),b=navigator.languages||[navigator.language],i;if(q)p.push(q.trim().toLowerCase());try{p.push(localStorage.getItem(${JSON.stringify(LANG_KEY)}))}catch(e){}for(i=0;i<b.length;i++)p.push(String(b[i]).toLowerCase().split("-")[0]);for(i=0;i<p.length;i++)if(l.indexOf(p[i])>=0){document.documentElement.lang=p[i];break}}catch(e){}`;
