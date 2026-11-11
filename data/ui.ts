import type { Mark } from "@/lib/game";
import type { Lang } from "@/lib/i18n";
import type { Vocab } from "@/lib/words";

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
  buttons: { help: "How to play", challenge: "Challenge a friend", stats: "Statistics", settings: "Settings", close: "Close" },
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
  /** After a win in 1 to 6 guesses: the game says one of the lines */
  wins: [
    ["Unreal!", "Did you peek?", "First try. Suspicious."],
    ["Brilliant!", "Two guesses. Show-off.", "That was quick."],
    ["Superb!", "Three is plenty.", "Smooth."],
    ["Well played!", "Solid.", "Right down the middle."],
    ["Nice!", "Got there.", "A little tight, but it counts."],
    ["Close call!", "Phew.", "On the last try. Bold."],
  ],
  /** After a first guess without a single letter of the word */
  blank: ["Well, that's five letters ruled out.", "A clean miss. That's information too."],
  lost: (word: string) => `The word was ${word.toUpperCase()}`,
  /** Lost with four letters in place */
  lostClose: (word: string) => `So close. The word was ${word.toUpperCase()}`,
  /** Said when one of these words is guessed and isn't the answer */
  eggs: {
    ordet: "That's the name of the game, not the answer.",
    hygge: "How cozy.",
    gætte: "That's the idea.",
    svært: "It is, isn't it?",
    snyde: "Not in this game.",
    guess: "That's the idea.",
    wrong: "You said it.",
    cheat: "Not in this game.",
    hello: "Hello to you too.",
  },
  /** On Christmas Eve */
  christmas: "Merry Christmas!",
  newWord: "New word",
  /** The link to a dictionary after a game */
  meaning: (word: string) => `What does ${word.toUpperCase()} mean?`,

  streak: {
    label: (n: number) => `Current streak: ${n}`,
    /** When a win brings the streak to a round number */
    milestone: (n: number) => `${n} in a row!`,
  },

  hint: {
    button: "Hint",
    reveal: (n: number, letter: string) => `Letter ${n} is ${letter.toUpperCase()}`,
    /** Read out for an empty tile that shows a hinted letter */
    tile: (letter: string) => `hint: ${letter.toUpperCase()}`,
  },

  mix: {
    /** The language switch's third pick */
    title: "Mix: English or Danish",
    /** Under the board while a Mix word is being played */
    ask: "English or Danish?",
    /** After the game: where the word came from */
    is: {
      en: (word: string) => `${word.toUpperCase()} is English`,
      da: (word: string) => `${word.toUpperCase()} is Danish`,
      both: (word: string) => `${word.toUpperCase()} is both English and Danish`,
    },
  },

  challenge: {
    title: "Challenge a friend",
    intro: "Pick a five-letter word and send the link. Your friend gets six tries and never sees the word.",
    word: "Your word",
    /** What the friend plays it with */
    plays: {
      en: "Played in English.",
      da: "Played in Danish.",
      mix: "Played in Mix: your friend won't know which language it is.",
    } satisfies Record<Vocab, string>,
    unknown: "That isn't in the word list. It still works, so names and inside jokes are fine, but check the spelling.",
    blocked: "That word can't be used.",
    send: "Send the link",
    copied: "Link copied",
    copyFailed: "Couldn't copy the link",
    /** The message that goes with the link */
    invite: "I picked a word for you in Ordet. Can you guess it?",
    /** In a shared result, before the link to the same word */
    same: "Try the same word:",
    /** Under the statistics, about that link */
    sameHint: "The link lets a friend try the same word.",
    /** Under the board while a friend's word is being played */
    playing: "A word from a friend",
    broken: "That link doesn't work",
    keepPlaying: "Keep playing",
  },

  /** Shown once to players who were here before it (lib/news.ts), and from the settings */
  news: {
    title: "What's new",
    items: {
      mix: { title: "Mix", text: "A third pick next to EN and DA. The word can be English or Danish, and you work out which." },
      challenge: { title: "Challenge a friend", text: "Send a word of your own as a link. A shared Unlimited result lets a friend try the same word." },
      hint: { title: "Hints", text: "Stuck? Outside the Daily, a hint gives you one letter." },
      meaning: { title: "Look it up", text: "After a game, a link takes you to the word in a dictionary." },
      streak: { title: "Streaks", text: "Your streak sits on the statistics button, and round numbers get confetti." },
      transfer: { title: "Move your statistics", text: "Settings has a code that carries them to another device." },
    },
    done: "Play",
  },

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
      { name: "Unlimited", text: "As many words as you like, one after another. A hint gives you one letter, and a shared result lets a friend try the same word." },
      { name: "Mix", text: "Next to EN and DA. The word can be English or Danish, and working out which is part of the puzzle." },
    ],
    languages: "English, Danish and Mix each have their own games and statistics.",
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

  /** In the settings: statistics live in the browser, so a code carries them to another one */
  transfer: {
    title: "Move to another device",
    hint: "Copy a code here and paste it on the other device. It carries your statistics and settings.",
    copy: "Copy code",
    copied: "Code copied",
    copyFailed: "Couldn't copy the code",
    paste: "Paste a code",
    import: "Import",
    /** Before statistics that are already on this device are overwritten */
    confirm: "This replaces the statistics on this device.",
    replace: "Replace",
    cancel: "Cancel",
    done: "Statistics imported",
    invalid: "That code doesn't work",
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
  buttons: { help: "Sådan spiller du", challenge: "Udfordr en ven", stats: "Statistik", settings: "Indstillinger", close: "Luk" },
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
  wins: [
    ["Utroligt!", "Snød du?", "Første forsøg. Mistænkeligt."],
    ["Genialt!", "To gæt. Nu blærer du dig.", "Det gik stærkt."],
    ["Fremragende!", "Tre er rigeligt.", "Elegant."],
    ["Godt spillet!", "Solidt.", "Lige i midten."],
    ["Flot!", "Den kom i hus.", "Lidt tæt på, men det tæller."],
    ["Puha, det var tæt på!", "Puha.", "I sidste forsøg. Modigt."],
  ],
  blank: ["Nå, så er de fem udelukket.", "Helt ved siden af. Det er også en slags viden."],
  lost: (word) => `Ordet var ${word.toUpperCase()}`,
  lostClose: (word) => `Så tæt på. Ordet var ${word.toUpperCase()}`,
  eggs: {
    ordet: "Det er spillets navn, ikke svaret.",
    hygge: "Så blev det hyggeligt.",
    gætte: "Ja, det er meningen.",
    svært: "Ja, det er det.",
    snyde: "Ikke i det her spil.",
    guess: "Ja, det er meningen.",
    wrong: "Det sagde du selv.",
    cheat: "Ikke i det her spil.",
    hello: "Hej med dig.",
  },
  christmas: "Glædelig jul!",
  newWord: "Nyt ord",
  meaning: (word) => `Hvad betyder ${word.toUpperCase()}?`,

  streak: {
    label: (n) => `Nuværende serie: ${n}`,
    milestone: (n) => `${n} i træk!`,
  },

  hint: {
    button: "Hint",
    reveal: (n, letter) => `Bogstav ${n} er ${letter.toUpperCase()}`,
    tile: (letter) => `hint: ${letter.toUpperCase()}`,
  },

  mix: {
    title: "Mix: engelsk eller dansk",
    ask: "Engelsk eller dansk?",
    is: {
      en: (word) => `${word.toUpperCase()} er engelsk`,
      da: (word) => `${word.toUpperCase()} er dansk`,
      both: (word) => `${word.toUpperCase()} er både engelsk og dansk`,
    },
  },

  challenge: {
    title: "Udfordr en ven",
    intro: "Vælg et ord på fem bogstaver, og send linket. Din ven får seks forsøg og ser aldrig ordet.",
    word: "Dit ord",
    plays: {
      en: "Spilles på engelsk.",
      da: "Spilles på dansk.",
      mix: "Spilles i Mix: din ven ved ikke, hvilket sprog det er.",
    },
    unknown: "Ordet står ikke i ordlisten. Det virker alligevel, så navne og indforståede jokes er fine, men tjek stavningen.",
    blocked: "Det ord kan ikke bruges.",
    send: "Send linket",
    copied: "Linket er kopieret",
    copyFailed: "Linket kunne ikke kopieres",
    invite: "Jeg har valgt et ord til dig i Ordet. Kan du gætte det?",
    same: "Prøv det samme ord:",
    sameHint: "Med linket kan en ven prøve det samme ord.",
    playing: "Et ord fra en ven",
    broken: "Linket virker ikke",
    keepPlaying: "Spil videre",
  },

  news: {
    title: "Nyt i Ordet",
    items: {
      mix: { title: "Mix", text: "Et tredje valg ved siden af EN og DA. Ordet kan være engelsk eller dansk, og du skal selv regne ud hvilket." },
      challenge: { title: "Udfordr en ven", text: "Send et ord, du selv har valgt, som et link. Deler du et resultat fra Ubegrænset, kan en ven prøve det samme ord." },
      hint: { title: "Hint", text: "Gået i stå? Uden for Dagens ord giver et hint dig ét bogstav." },
      meaning: { title: "Slå ordet op", text: "Efter et spil fører et link dig til ordet i en ordbog." },
      streak: { title: "Serier", text: "Din serie står på statistikknappen, og runde tal fejres med konfetti." },
      transfer: { title: "Flyt din statistik", text: "I Indstillinger er der en kode, som tager den med til en anden enhed." },
    },
    done: "Spil",
  },

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
      { name: "Ubegrænset", text: "Så mange ord, du vil, det ene efter det andet. Et hint giver dig ét bogstav, og når du deler resultatet, kan en ven prøve det samme ord." },
      { name: "Mix", text: "Ved siden af EN og DA. Ordet kan være engelsk eller dansk, og du skal selv regne ud hvilket." },
    ],
    languages: "Engelsk, dansk og Mix har hver deres spil og statistik.",
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

  transfer: {
    title: "Flyt til en anden enhed",
    hint: "Kopiér en kode her, og indsæt den på den anden enhed. Den indeholder din statistik og dine indstillinger.",
    copy: "Kopiér kode",
    copied: "Koden er kopieret",
    copyFailed: "Koden kunne ikke kopieres",
    paste: "Indsæt en kode",
    import: "Importér",
    confirm: "Det erstatter statistikken på denne enhed.",
    replace: "Erstat",
    cancel: "Annuller",
    done: "Statistikken er importeret",
    invalid: "Koden virker ikke",
  },
};

export const UI: Record<Lang, UiStrings> = { en, da };

/** The language switch names each language in its own words. Mix is both, so it's the same in either. */
export const VOCAB_NAMES: Record<Vocab, { code: string; name: string }> = {
  en: { code: "EN", name: "English" },
  da: { code: "DA", name: "Dansk" },
  mix: { code: "MIX", name: "Mix" },
};

const DANISH_KEYS = ["qwertyuiopå", "asdfghjklæø", "zxcvbnm"];

/** On-screen keyboards: QWERTY, and the Danish layout with Å, Æ and Ø where a Danish keyboard has them (Mix needs those too) */
export const KEYBOARDS: Record<Vocab, string[]> = {
  en: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
  da: DANISH_KEYS,
  mix: DANISH_KEYS,
};
