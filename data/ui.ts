import type { Mark } from "@/lib/game";
import type { Lang } from "@/lib/i18n";

/** A worked example in the help: the word, the tile it explains, and what that tile means */
export type Example = { word: string; index: number; mark: Mark; text: string };

const en = {
  title: "Ordet",
  tagline: "Guess the word in six tries",
  loading: "Loading words...",
  loadFailed: "The words didn't load. Check your connection.",
  retry: "Try again",
  modes: { label: "Game mode", daily: "Daily", unlimited: "Unlimited" },
  language: "Language",
  buttons: { help: "How to play", stats: "Statistics", settings: "Settings", close: "Close" },
  keys: { label: "Keyboard", enter: "Enter", backspace: "Delete" },

  board: "Guesses",
  row: (n: number) => `Guess ${n}`,
  tile: (n: number, letter: string | null, mark: Mark | null): string =>
    letter ? `Letter ${n}, ${letter.toUpperCase()}${mark ? `, ${en.marks[mark]}` : ""}` : `Letter ${n}, empty`,
  marks: { correct: "correct", present: "in the word, wrong spot", absent: "not in the word" } satisfies Record<Mark, string>,
  /** Read out after each guess */
  result: (guess: string, marks: string[]) => `${guess.toUpperCase()}: ${marks.join(", ")}`,

  problems: {
    short: "Not enough letters",
    unknown: "Not in the word list",
    position: (n: number, letter: string) => `Letter ${n} must be ${letter.toUpperCase()}`,
    missing: (letter: string) => `The guess must use ${letter.toUpperCase()}`,
  },
  /** After a win in 1 to 6 guesses */
  wins: ["Unreal!", "Brilliant!", "Superb!", "Well played!", "Nice!", "Close call!"],
  lost: (word: string) => `The word was ${word.toUpperCase()}`,
  newWord: "New word",

  help: {
    title: "How to play",
    intro: "Guess the five-letter word in six tries.",
    rules: [
      "Every guess has to be a real word.",
      "After each guess, the tiles change color to show how close you were.",
      "Tap a tile, or use the arrow keys, to move between the letters. That way a letter you already know can go in its spot first.",
    ],
    examples: [
      { word: "crane", index: 0, mark: "correct", text: "C is in the word, in this spot." },
      { word: "pilot", index: 2, mark: "present", text: "L is in the word, but in another spot." },
      { word: "storm", index: 4, mark: "absent", text: "M isn't in the word." },
    ] as Example[],
    modes: [
      { name: "Daily", text: "One word a day, the same for everyone. A new one comes at midnight." },
      { name: "Unlimited", text: "As many words as you like, one after another." },
    ],
    languages: "English and Danish each have their own words, games and statistics.",
  },

  stats: {
    title: "Statistics",
    played: "Played",
    winRate: "Win %",
    streak: "Current streak",
    best: "Best streak",
    distribution: "Guess distribution",
    /** Read out for the X line: games lost */
    unsolved: "Not solved",
    none: "No games yet. Your results will show up here.",
    next: "Next word in",
    share: "Share",
    copied: "Result copied",
    copyFailed: "Couldn't copy the result",
  },

  settings: {
    title: "Settings",
    hard: "Hard mode",
    hardHint: "Every revealed hint must be used in the next guesses.",
    hardLocked: "Hard mode can only be turned on before the first guess",
    dark: "Dark theme",
    contrast: "High contrast",
    contrastHint: "Orange and blue instead of green and yellow, for color vision deficiency.",
    madeBy: "Made by",
    source: "Source code",
    danishWords: "Danish words from Den Danske Ordbog by",
  },
};

export type UiStrings = typeof en;

const da: UiStrings = {
  title: "Ordet",
  tagline: "Gæt ordet på seks forsøg",
  loading: "Henter ord...",
  loadFailed: "Ordene kunne ikke hentes. Tjek din forbindelse.",
  retry: "Prøv igen",
  modes: { label: "Spiltype", daily: "Dagens ord", unlimited: "Ubegrænset" },
  language: "Sprog",
  buttons: { help: "Sådan spiller du", stats: "Statistik", settings: "Indstillinger", close: "Luk" },
  keys: { label: "Tastatur", enter: "Enter", backspace: "Slet" },

  board: "Gæt",
  row: (n) => `Gæt ${n}`,
  tile: (n, letter, mark) => (letter ? `Bogstav ${n}, ${letter.toUpperCase()}${mark ? `, ${da.marks[mark]}` : ""}` : `Bogstav ${n}, tomt`),
  marks: { correct: "rigtig plads", present: "med i ordet, forkert plads", absent: "ikke med i ordet" },
  result: (guess, marks) => `${guess.toUpperCase()}: ${marks.join(", ")}`,

  problems: {
    short: "For få bogstaver",
    unknown: "Ordet findes ikke i ordlisten",
    position: (n, letter) => `Bogstav ${n} skal være ${letter.toUpperCase()}`,
    missing: (letter) => `Gættet skal indeholde ${letter.toUpperCase()}`,
  },
  wins: ["Utroligt!", "Genialt!", "Fremragende!", "Godt spillet!", "Flot!", "Puha, det var tæt på!"],
  lost: (word) => `Ordet var ${word.toUpperCase()}`,
  newWord: "Nyt ord",

  help: {
    title: "Sådan spiller du",
    intro: "Gæt ordet på fem bogstaver på seks forsøg.",
    rules: [
      "Hvert gæt skal være et rigtigt ord.",
      "Efter hvert gæt skifter felterne farve og viser, hvor tæt du var på.",
      "Tryk på et felt, eller brug piletasterne, for at flytte mellem bogstaverne. Så kan et bogstav, du allerede kender, komme på plads først.",
    ],
    examples: [
      { word: "kaffe", index: 0, mark: "correct", text: "K er med i ordet og står på den rigtige plads." },
      { word: "skole", index: 2, mark: "present", text: "O er med i ordet, men står et andet sted." },
      { word: "bølge", index: 1, mark: "absent", text: "Ø er ikke med i ordet." },
    ],
    modes: [
      { name: "Dagens ord", text: "Ét ord om dagen, det samme for alle. Der kommer et nyt ved midnat." },
      { name: "Ubegrænset", text: "Så mange ord, du vil, det ene efter det andet." },
    ],
    languages: "Engelsk og dansk har hver deres ord, spil og statistik.",
  },

  stats: {
    title: "Statistik",
    played: "Spillet",
    winRate: "Vundet %",
    streak: "Nuværende serie",
    best: "Bedste serie",
    distribution: "Fordeling af gæt",
    unsolved: "Ikke løst",
    none: "Ingen spil endnu. Dine resultater kommer til at stå her.",
    next: "Næste ord om",
    share: "Del",
    copied: "Resultatet er kopieret",
    copyFailed: "Resultatet kunne ikke kopieres",
  },

  settings: {
    title: "Indstillinger",
    hard: "Svær tilstand",
    hardHint: "Alle afslørede bogstaver skal bruges i de næste gæt.",
    hardLocked: "Svær tilstand kan kun slås til før første gæt",
    dark: "Mørkt tema",
    contrast: "Høj kontrast",
    contrastHint: "Orange og blå i stedet for grøn og gul, til farveblinde.",
    madeBy: "Lavet af",
    source: "Kildekode",
    danishWords: "Danske ord fra Den Danske Ordbog fra",
  },
};

export const UI: Record<Lang, UiStrings> = { en, da };

/** The language switch names each language in its own words */
export const LANG_NAMES: Record<Lang, { code: string; name: string }> = {
  en: { code: "EN", name: "English" },
  da: { code: "DA", name: "Dansk" },
};

/** On-screen keyboards: QWERTY, and the Danish layout with Å, Æ and Ø where a Danish keyboard has them */
export const KEYBOARDS: Record<Lang, string[]> = {
  en: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
  da: ["qwertyuiopå", "asdfghjklæø", "zxcvbnm"],
};
