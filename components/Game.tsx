"use client";

import { BookOpen, Lightbulb } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { UI } from "@/data/ui";
import { challengeLink, decodeChallenge, encodeChallenge } from "@/lib/challenge";
import { dateKey, dayNumber, isChristmasEve, msUntilMidnight } from "@/lib/daily";
import { dictionaryUrl } from "@/lib/dictionary";
import { addGuess, addHint, canHint, evaluate, guessProblem, letterMarks, newGame, status, type Game as Round, type Problem } from "@/lib/game";
import { LANG_KEY, pickLang, type Lang } from "@/lib/i18n";
import { backspace, clearSlot, draftWord, EMPTY_DRAFT, moveTo, step, typeLetter, type Draft } from "@/lib/input";
import { moment, pick } from "@/lib/moments";
import { NEWS, welcome } from "@/lib/news";
import { DEFAULT_SETTINGS, isMode, parseSave, RECENT_LIMIT, SAVE_KEY, slot, type Mode, type Save, type Settings } from "@/lib/save";
import { shareText } from "@/lib/share";
import { currentStreak, EMPTY_STATS, isMilestone, recordResult } from "@/lib/stats";
import { readJson, readStorage, writeStorage } from "@/lib/storage";
import { applyTransfer, exportCode, type Transfer } from "@/lib/transfer";
import { dailyWord, isVocab, loadVocabulary, pickFrom, toLetter, WORD_LENGTH, wordLangs, type Vocab, type Vocabulary } from "@/lib/words";
import Board from "./Board";
import ChallengePanel from "./ChallengePanel";
import Confetti, { type Burst } from "./Confetti";
import Countdown from "./Countdown";
import Header, { type Panel } from "./Header";
import HelpPanel from "./HelpPanel";
import Keyboard from "./Keyboard";
import Modal from "./Modal";
import NewsPanel from "./NewsPanel";
import SettingsPanel from "./SettingsPanel";
import StatsPanel from "./StatsPanel";

// The reveal: each tile flips for FLIP_MS, STAGGER_MS after the one before it
const FLIP_MS = 500;
const STAGGER_MS = 300;
const REVEAL_MS = STAGGER_MS * (WORD_LENGTH - 1) + FLIP_MS;
const BOUNCE_MS = 1000;
const BOUNCE_STAGGER_MS = 100;

const SHAKE: Keyframe[] = [0, -6, 6, -6, 6, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` }));
const POP: Keyframe[] = [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }];
const BOUNCE: Keyframe[] = [
  { transform: "translateY(0)" },
  { transform: "translateY(-40%)", offset: 0.25 },
  { transform: "translateY(4%)", offset: 0.45 },
  { transform: "translateY(-15%)", offset: 0.6 },
  { transform: "translateY(2%)", offset: 0.75 },
  { transform: "translateY(0)" },
];

/** The confetti is cut from the tile colors, and from Christmas ones on Christmas Eve */
const TILE_COLORS = ["--correct", "--present", "--tile-filled"];
const CHRISTMAS_COLORS = ["#c0392b", "#2f8f5b", "#d4a72c", "#e9e4d4"];

type Words = { vocab: Vocab; list: Vocabulary } | { vocab: Vocab; failed: true };
type Toast = { id: number; text: ReactNode };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** See Keyboard: a click under the board mustn't leave focus on a button that the next Enter would press */
const keepFocus = (e: MouseEvent) => e.preventDefault();

const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeDark(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Takes a link's parameter out of the address once it has done its job, so a reload doesn't do it again */
function dropParam(name: string) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  window.history.replaceState(null, "", url);
}

/** The English daily word from our own API (the NYT's word, or our fallback), or null if it can't be reached */
async function fetchDaily(date: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/daily?date=${date}`, { signal: AbortSignal.timeout(5_000) });
    const data: unknown = res.ok ? await res.json() : null;
    const solution = (data as { solution?: unknown } | null)?.solution;
    return typeof solution === "string" && /^[a-z]{5}$/.test(solution) ? solution : null;
  } catch {
    return null;
  }
}

/** The clipboard, or the old copy command in frames that block it */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  // Everything outside an open dialog is inert, so the text has to be selected inside it
  (document.querySelector("dialog[open]") ?? document.body).append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

/** The share sheet on phones, the clipboard elsewhere */
async function shareResult(text: string): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

/** The save with a fresh Unlimited word that hasn't come up lately */
function withNewWord(save: Save, vocab: Vocab, list: Vocabulary): Save {
  const recent = save.recent[vocab] ?? [];
  const word = pickFrom(list, recent);
  return { ...save, games: { ...save.games, [slot(vocab, "unlimited")]: newGame(word, null) }, recent: { ...save.recent, [vocab]: [...recent, word].slice(-RECENT_LIMIT) } };
}

export default function Game() {
  // Everything below depends on the player's browser, so it's set up after the first render
  const [save, setSave] = useState<Save | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [today, setToday] = useState("");
  const [words, setWords] = useState<Words | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [revealing, setRevealing] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcement, setAnnouncement] = useState("");
  // A friend's word (a ?c= link) is being played instead of the saved mode
  const [visiting, setVisiting] = useState(false);
  const [burst, setBurst] = useState<Burst | null>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef(new Set<number>());
  const toastId = useRef(0);
  const burstId = useRef(0);
  const greeted = useRef(false);
  const systemDark = useSyncExternalStore(subscribeDark, () => window.matchMedia(DARK_QUERY).matches, () => false);

  // The language is the interface's, and the words' too unless Mix is on or a friend's word says otherwise
  const ui = UI[lang];
  const loaded = save !== null;
  const settings: Settings = save?.settings ?? DEFAULT_SETTINGS;
  const mode = settings.mode;
  const challenge = (visiting && save?.challenge) || null;
  const vocab: Vocab = challenge ? challenge.vocab : settings.mix ? "mix" : lang;
  const daily = !challenge && mode === "daily";
  const key = slot(vocab, mode);
  const list = words?.vocab === vocab && "list" in words ? words.list : null;
  const failed = words?.vocab === vocab && "failed" in words;
  const day = today ? dayNumber(today) : null;
  const stored = challenge ? challenge.game : save?.games[key];
  // A daily game from an earlier date is over: today's replaces it
  const game = stored && (!daily || stored.day === day) ? stored : null;
  const state = game ? status(game) : null;
  const stats = save?.stats[key] ?? EMPTY_STATS;
  const dark = settings.theme ? settings.theme === "dark" : systemDark;
  const festive = today !== "" && isChristmasEve(today);
  const canType = game !== null && state === "playing" && revealing === null && panel === null;
  const hardLocked = !settings.hard && game !== null && state === "playing" && game.guesses.length > 0;

  // ─── Timers and effects ───

  const later = useCallback((run: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      run();
    }, ms);
    timers.current.add(id);
  }, []);

  /** Switching language or mode drops a reveal in progress (the guess is already saved) */
  const cancelReveal = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
    setRevealing(null);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const toast = useCallback((text: ReactNode, ms = 1_600) => {
    const id = ++toastId.current;
    setToasts((all) => [...all.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), ms);
  }, []);

  const animate = (row: number, tile: number | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    if (reducedMotion()) return;
    const el = tile === null ? rows.current[row] : rows.current[row]?.children[tile];
    el?.animate(frames, options);
  };

  /** Confetti, for the wins worth it. Never under reduced motion. */
  const celebrate = () => {
    if (reducedMotion()) return;
    const css = getComputedStyle(document.documentElement);
    setBurst({ id: ++burstId.current, colors: festive ? CHRISTMAS_COLORS : TILE_COLORS.map((token) => css.getPropertyValue(token).trim()) });
  };

  // ─── Setup ───

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const firstVisit = readStorage(SAVE_KEY) === null;
    let restored = parseSave(readJson(SAVE_KEY));
    let picked = pickLang({ search: window.location.search, saved: readStorage(LANG_KEY), browser: navigator.languages ?? [navigator.language] });

    // Links: ?mode= opens a mode, and ?lang= a language's words or Mix (pickLang has taken the interface from it)
    const linkedMode = params.get("mode");
    const linkedVocab = params.get("lang")?.trim().toLowerCase();
    if (isMode(linkedMode)) restored = { ...restored, settings: { ...restored.settings, mode: linkedMode } };
    if (isVocab(linkedVocab)) restored = { ...restored, settings: { ...restored.settings, mix: linkedVocab === "mix" } };

    // ?c= carries a friend's word
    const code = params.get("c")?.trim().toLowerCase();
    const linked = code ? decodeChallenge(code) : null;
    if (code && linked) {
      // The same link again picks the game up where it was left, so a word can't be tried twice
      if (restored.challenge?.code !== code) restored = { ...restored, challenge: { code, vocab: linked.vocab, game: newGame(linked.word, null) } };
      // A word in one language comes with that language, as a ?lang= link would
      if (linked.vocab !== "mix") picked = linked.vocab;
      setVisiting(true);
    } else if (code) {
      dropParam("c");
      toast(UI[picked].challenge.broken, 3_000);
    }

    // Someone new gets the help, and someone who was here before the latest news gets that, once
    const opening = welcome({ firstVisit, seen: restored.news, friend: linked !== null });
    if (opening) restored = { ...restored, news: NEWS };

    setSave(restored);
    setLang(picked);
    setToday(dateKey(new Date()));
    if (opening) setPanel(opening);
  }, [toast]);

  useEffect(() => {
    if (save) writeStorage(SAVE_KEY, JSON.stringify(save));
  }, [save]);

  // Until the language is picked, <html lang> keeps the one the layout's script put there
  useEffect(() => {
    if (loaded) document.documentElement.lang = lang;
  }, [loaded, lang]);

  // The inline script in the layout already applied the saved theme before the first paint
  const { theme, contrast } = settings;
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    if (contrast) root.dataset.contrast = "high";
    else delete root.dataset.contrast;
  }, [loaded, theme, contrast]);

  useEffect(() => {
    if (!today) return;
    let live = true;
    loadVocabulary(vocab).then(
      (list) => live && setWords({ vocab, list }),
      () => live && setWords({ vocab, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [vocab, today, attempt]);

  // A new day at midnight, or when a tab left open overnight comes back
  useEffect(() => {
    if (!today) return;
    const check = () => {
      const now = dateKey(new Date());
      if (now === today) return;
      setToday(now);
      setDraft(EMPTY_DRAFT);
    };
    const timer = window.setTimeout(check, msUntilMidnight(new Date()) + 1_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [today]);

  // Christmas Eve gets a greeting, once, when the game opens or the day comes
  useEffect(() => {
    if (!festive || greeted.current) return;
    greeted.current = true;
    toast(ui.christmas, 3_000);
  }, [festive, ui, toast]);

  // Start a game when this vocabulary and mode has none yet (or yesterday's). A friend's word came with its link.
  const missing = loaded && list !== null && day !== null && game === null && !challenge;
  useEffect(() => {
    if (!missing || !list || day === null) return;
    let live = true;
    void (async () => {
      // English follows the NYT's word, Danish and Mix their own schedules
      const word = mode === "daily" ? ((vocab === "en" ? await fetchDaily(today) : null) ?? dailyWord(list, day)) : null;
      if (!live) return;
      setSave((s) => {
        if (!s) return s;
        const existing = s.games[key];
        if (existing && (mode === "unlimited" || existing.day === day)) return s;
        return word ? { ...s, games: { ...s.games, [key]: newGame(word, day) } } : withNewWord(s, vocab, list);
      });
    })();
    return () => {
      live = false;
    };
  }, [missing, list, day, today, mode, vocab, key]);

  // A hint that names one of the game's letters isn't translated, as with the tiles (see Tile)
  const problemText = (problem: Problem): ReactNode => {
    switch (problem.kind) {
      case "short":
        return ui.problems.short;
      case "unknown":
        return ui.problems.unknown;
      case "position":
        return <span translate="no">{ui.problems.position(problem.index + 1, problem.letter)}</span>;
      case "missing":
        return <span translate="no">{ui.problems.missing(problem.letter)}</span>;
    }
  };

  // ─── Actions ───

  /** The save with the game being played put back where it's kept: with a friend's word, or in the mode's slot */
  const putGame = (s: Save, next: Round): Save =>
    challenge ? { ...s, challenge: s.challenge && { ...s.challenge, game: next } } : { ...s, games: { ...s.games, [key]: next } };

  const newWord = () => {
    if (!list) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    setPanel(null);
    setSave((s) => s && withNewWord(s, vocab, list));
  };

  const type = (letter: string) => {
    if (!canType || !game) return;
    const next = typeLetter(draft, letter);
    if (next === draft) return;
    setDraft(next);
    animate(game.guesses.length, draft.cursor, POP, { duration: 120 });
  };

  const erase = () => {
    if (canType) setDraft(backspace(draft));
  };

  /** The Delete key */
  const clear = () => {
    if (canType) setDraft(clearSlot(draft));
  };

  /** A tap on a tile of the row being typed */
  const select = (slot: number) => {
    if (canType) setDraft(moveTo(draft, slot));
  };

  /** The arrow keys, Home and End. The tile under the cursor is read out, since focus stays where it was. */
  const move = (next: Draft) => {
    if (!canType || next === draft) return;
    setDraft(next);
    setAnnouncement(ui.tile(next.cursor + 1, next.letters[next.cursor] || null, null));
  };

  /** One letter of the answer, given away for good: it waits in its slot in every row from here on */
  const hint = () => {
    if (!canType || !game) return;
    const next = addHint(game);
    const at = next.hints.at(-1);
    if (next === game || at === undefined) return;
    setSave((s) => s && putGame(s, next));
    toast(<span translate="no">{ui.hint.reveal(at + 1, [...game.solution][at] ?? "")}</span>, 3_000);
  };

  const submit = () => {
    if (!game || !list || revealing !== null || panel) return;
    if (state !== "playing") {
      if (!challenge && mode === "unlimited") newWord();
      return;
    }
    const row = game.guesses.length;
    // A row with an empty slot comes out short, so it's refused as "not enough letters"
    const guess = draftWord(draft);
    const problem = guessProblem(guess, { ...game, hard: game.hard && settings.hard }, list.accepted);
    if (problem) {
      animate(row, null, SHAKE, { duration: 500 });
      toast(problemText(problem));
      return;
    }

    const next = addGuess(game, guess, settings.hard);
    const what = moment(next);
    const won = what?.kind === "won";
    // A friend's word keeps no statistics
    const counted = (won || what?.kind === "lost") && !challenge;
    const nextStats = counted ? recordResult(stats, { won, tries: next.guesses.length, day: next.day }) : stats;
    setSave((s) => s && { ...putGame(s, next), stats: counted ? { ...s.stats, [key]: nextStats } : s.stats });
    setDraft(EMPTY_DRAFT);

    const still = reducedMotion();
    setRevealing(still ? null : row);
    later(
      () => {
        setRevealing(null);
        const marks = evaluate(guess, game.solution);
        setAnnouncement(ui.result(guess, [...guess].map((letter, i) => `${letter.toUpperCase()} ${ui.marks[marks[i]!]}`)));
        if (what?.kind === "won") {
          for (let i = 0; i < WORD_LENGTH; i++) animate(row, i, BOUNCE, { duration: BOUNCE_MS, delay: i * BOUNCE_STAGGER_MS });
          toast(pick(ui.wins[row] ?? []) ?? "", 2_000);
          const milestone = counted && isMilestone(nextStats.streak, daily);
          if (milestone) toast(ui.streak.milestone(nextStats.streak), 3_000);
          if (milestone || what.tries <= 2 || festive) celebrate();
          if (!challenge) later(() => setPanel("stats"), still ? 1_200 : BOUNCE_MS + BOUNCE_STAGGER_MS * WORD_LENGTH + 400);
        } else if (what?.kind === "lost") {
          // Translated into Danish, "The word was CRANE" said KRAN
          toast(<span translate="no">{(what.close ? ui.lostClose : ui.lost)(game.solution)}</span>, 4_000);
          if (!challenge) later(() => setPanel("stats"), 2_400);
        } else {
          // A few words get an answer of their own, and so does a first guess that hit nothing
          const egg = Object.prototype.hasOwnProperty.call(ui.eggs, guess) ? ui.eggs[guess as keyof typeof ui.eggs] : null;
          const line = egg ?? (what?.kind === "blank" ? pick(ui.blank) : null);
          if (line) toast(line, 2_600);
        }
      },
      still ? 0 : REVEAL_MS,
    );
  };

  /** Back from a friend's word to the player's own games. The word stays saved, so its link picks it up again. */
  const leave = () => {
    if (!visiting) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    setVisiting(false);
    dropParam("c");
  };

  const changeSettings = (patch: Partial<Settings>) => setSave((s) => s && { ...s, settings: { ...s.settings, ...patch } });

  const changeMode = (next: Mode) => {
    if (next === mode && !visiting) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    leave();
    changeSettings({ mode: next });
  };

  /** The language switch: English or Danish change the interface and the words, Mix only the words */
  const changeVocab = (next: Vocab) => {
    if (next === vocab) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    leave();
    if (next !== "mix") {
      writeStorage(LANG_KEY, next);
      setLang(next);
    }
    changeSettings({ mix: next === "mix" });
    // A ?lang= link beats the saved pick, so it's taken out of the address once the player picks
    dropParam("lang");
  };

  const setHard = (on: boolean) => {
    if (!(on && hardLocked)) changeSettings({ hard: on });
  };

  /** What to tell the player afterwards, if anything (the share sheet speaks for itself) */
  const share = async (): Promise<string | null> => {
    if (!game) return null;
    // A word that isn't the day's goes along as a link, so the friend who gets the result can try it too
    const code = game.day === null ? encodeChallenge(game.solution, vocab) : null;
    const same = code ? { label: ui.challenge.same, link: challengeLink(code) } : undefined;
    const outcome = await shareResult(shareText(game, { vocab, dark, contrast: settings.contrast, same }));
    return outcome === "copied" ? ui.stats.copied : outcome === "failed" ? ui.stats.copyFailed : null;
  };

  /** A word of the player's own, sent as an invitation with its link */
  const sendChallenge = async (code: string): Promise<string | null> => {
    const outcome = await shareResult(`${ui.challenge.invite}\n${challengeLink(code)}`);
    return outcome === "copied" ? ui.challenge.copied : outcome === "failed" ? ui.challenge.copyFailed : null;
  };

  // ─── The physical keyboard ───

  const onKeyDown = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    onKeyDown.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.defaultPrevented || panel) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Enter") {
        // Enter on a focused button presses the button
        if (target?.closest("button, a")) return;
        e.preventDefault();
        submit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        erase();
      } else if (e.key === "Delete") {
        e.preventDefault();
        clear();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        // Alt with an arrow is the browser's back and forward
        if (e.altKey) return;
        e.preventDefault();
        if (e.key === "ArrowLeft") move(step(draft, -1));
        else if (e.key === "ArrowRight") move(step(draft, 1));
        else move(moveTo(draft, e.key === "Home" ? 0 : WORD_LENGTH - 1));
      } else {
        const letter = toLetter(e.key, vocab);
        if (letter) type(letter);
      }
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // ─── Render ───

  const shown = game?.guesses ?? [];
  const marks = letterMarks(revealing === null ? shown : shown.slice(0, revealing), game?.solution ?? "");
  // The game once it's over and its last tiles have turned
  const over = game !== null && state !== "playing" && revealing === null ? game : null;
  // Where the word came from: both languages for SPORT in Mix, neither for a friend's made-up word
  const origin = over && list ? wordLangs(list, over.solution) : [];
  const from = origin.length > 1 ? "both" : origin[0];
  // What there is to say about the word: which language it was in Mix, or what it was after a loss
  const line = !over ? null : vocab === "mix" && from ? ui.mix.is[from](over.solution) : state === "lost" ? ui.lost(over.solution) : null;
  // A word of both languages is looked up in the player's own, and a made-up word nowhere
  const meaningLang: Lang | null = origin.includes(lang) ? lang : (origin[0] ?? (challenge || vocab === "mix" ? null : vocab));
  const meaning = over && meaningLang ? { href: dictionaryUrl(over.solution, meaningLang), label: ui.meaning(over.solution) } : null;
  // Under the board while a word is played: what kind of word it is, when that isn't plain from the switches
  const caption = [challenge && ui.challenge.playing, vocab === "mix" && ui.mix.ask].filter(Boolean).join(" · ");
  const outline = "rounded-full border-2 border-[var(--tile-filled)] px-4 py-1.5 font-bold";
  const solid = "rounded-full bg-[var(--correct)] px-5 py-2 font-bold text-white";

  return (
    <div className="flex h-dvh flex-col">
      <Header
        ui={ui}
        vocab={vocab}
        mode={challenge ? null : mode}
        ready={loaded}
        streak={currentStreak(stats, mode === "daily" ? day : null)}
        lit={mode !== "daily" || stats.lastDay === day}
        onVocab={changeVocab}
        onMode={changeMode}
        onOpen={setPanel}
      />

      <main className="play relative flex min-h-0 flex-1 flex-col items-center justify-center">
        <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-2 z-10 flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => (
            <p key={t.id} className="toast rounded-md bg-[var(--toast)] px-3 py-2 text-center text-sm font-semibold text-[var(--toast-fg)] shadow-lg">
              {t.text}
            </p>
          ))}
        </div>
        <p className="sr-only" aria-live="polite" translate="no">
          {announcement}
        </p>

        {failed ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <p>{ui.loadFailed}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className={solid}>
              {ui.retry}
            </button>
          </div>
        ) : (
          <Board
            guesses={shown}
            solution={game?.solution ?? ""}
            draft={state === "playing" ? draft : null}
            hints={game?.hints ?? []}
            showCursor={canType}
            revealing={revealing}
            rowRefs={rows}
            ui={ui}
            onSelect={select}
          />
        )}
        {!game && !failed && today && <p className="sr-only">{ui.loading}</p>}
      </main>

      <div className="flex min-h-14 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1 text-sm">
        {game && state === "playing" && (
          <>
            {caption && <span className="text-[var(--muted)]">{caption}</span>}
            {canHint(game) && (
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={hint}
                className="flex items-center gap-1.5 rounded-full border-2 border-[var(--tile-border)] px-3 py-1 font-semibold text-[var(--muted)] hover:border-[var(--tile-filled)] hover:text-[var(--fg)]"
              >
                <Lightbulb aria-hidden className="size-4" />
                {ui.hint.button}
              </button>
            )}
          </>
        )}
        {over && (
          <>
            {/* The line about the word is also the way to its dictionary entry, when it has one. Neither is translated (see Tile). */}
            {line &&
              (meaning ? (
                <a
                  href={meaning.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={meaning.label}
                  translate="no"
                  onMouseDown={keepFocus}
                  className="font-semibold underline decoration-[var(--tile-filled)] decoration-dotted underline-offset-4 hover:decoration-solid"
                >
                  {line}
                  <span className="sr-only">. {meaning.label}</span>
                </a>
              ) : (
                <span className="font-semibold" translate="no">
                  {line}
                </span>
              ))}
            {/* Kept together, so a long line pushes the buttons to a row of their own instead of splitting them */}
            <span className="flex items-center gap-3">
              {challenge ? (
                <button type="button" onMouseDown={keepFocus} onClick={leave} className={solid}>
                  {ui.challenge.keepPlaying}
                </button>
              ) : daily ? (
                <span className="text-[var(--muted)]">
                  {ui.stats.next} <Countdown className="font-semibold text-[var(--fg)] tabular-nums" />
                </span>
              ) : (
                <button type="button" onMouseDown={keepFocus} onClick={newWord} className={solid}>
                  {ui.newWord}
                </button>
              )}
              {meaning && !line && (
                <a
                  href={meaning.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={meaning.label}
                  title={meaning.label}
                  translate="no"
                  onMouseDown={keepFocus}
                  className="grid size-9 flex-none place-items-center rounded-full border-2 border-[var(--tile-border)] text-[var(--muted)] hover:border-[var(--tile-filled)] hover:text-[var(--fg)]"
                >
                  <BookOpen aria-hidden className="size-4" />
                </a>
              )}
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={async () => {
                  const note = await share();
                  if (note) toast(note);
                }}
                className={outline}
              >
                {ui.stats.share}
              </button>
            </span>
          </>
        )}
      </div>

      <Keyboard vocab={vocab} marks={marks} ui={ui} onLetter={type} onEnter={submit} onBackspace={erase} />
      <Confetti burst={burst} />

      <Modal open={panel === "help"} title={ui.help.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <HelpPanel ui={ui} />
      </Modal>
      <Modal open={panel === "news"} title={ui.news.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <NewsPanel ui={ui} onClose={() => setPanel(null)} />
      </Modal>
      <Modal open={panel === "challenge"} title={ui.challenge.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <ChallengePanel ui={ui} vocab={vocab} accepted={list?.accepted ?? null} onSend={sendChallenge} />
      </Modal>
      <Modal open={panel === "stats"} title={ui.stats.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <StatsPanel
          ui={ui}
          vocab={vocab}
          mode={mode}
          stats={stats}
          today={day}
          // A friend's word has no statistics, so the panel shows the mode's own and nothing about the word
          game={challenge ? null : over}
          line={line}
          meaning={meaning}
          shareHint={daily ? null : ui.challenge.sameHint}
          onShare={share}
          onNewWord={newWord}
        />
      </Modal>
      <Modal open={panel === "settings"} title={ui.settings.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <SettingsPanel
          ui={ui}
          settings={settings}
          hardLocked={hardLocked}
          dark={dark}
          hasStats={Object.values(save?.stats ?? {}).some((s) => s.played > 0)}
          onHard={setHard}
          onDark={(on) => changeSettings({ theme: on ? "dark" : "light" })}
          onContrast={(on) => changeSettings({ contrast: on })}
          onCopyCode={async () => save !== null && (await copyText(exportCode(save)))}
          onImport={(transfer: Transfer) => setSave((s) => s && applyTransfer(s, transfer))}
          onNews={() => setPanel("news")}
        />
      </Modal>
    </div>
  );
}
