"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { UI } from "@/data/ui";
import { dailyAnswer, dateKey, dayNumber, msUntilMidnight } from "@/lib/daily";
import { addGuess, evaluate, guessProblem, letterMarks, newGame, status, type Problem } from "@/lib/game";
import { LANG_KEY, pickLang, type Lang } from "@/lib/i18n";
import { backspace, clearSlot, draftWord, EMPTY_DRAFT, moveTo, step, typeLetter, type Draft } from "@/lib/input";
import { DEFAULT_SETTINGS, isMode, parseSave, RECENT_LIMIT, SAVE_KEY, slot, type Mode, type Save, type Settings } from "@/lib/save";
import { shareText } from "@/lib/share";
import { EMPTY_STATS, recordResult } from "@/lib/stats";
import { readJson, readStorage, writeStorage } from "@/lib/storage";
import { loadWords, pickAnswer, toLetter, WORD_LENGTH, type WordList } from "@/lib/words";
import Board from "./Board";
import Countdown from "./Countdown";
import Header, { type Panel } from "./Header";
import HelpPanel from "./HelpPanel";
import Keyboard from "./Keyboard";
import Modal from "./Modal";
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

type Words = { lang: Lang; list: WordList } | { lang: Lang; failed: true };
type Toast = { id: number; text: ReactNode };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeDark(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
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

/** The share sheet on phones, the clipboard elsewhere, and the old copy command in frames that block the clipboard */
async function shareResult(text: string): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {}
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied ? "copied" : "failed";
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
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef(new Set<number>());
  const toastId = useRef(0);
  const systemDark = useSyncExternalStore(subscribeDark, () => window.matchMedia(DARK_QUERY).matches, () => false);

  const ui = UI[lang];
  const loaded = save !== null;
  const settings: Settings = save?.settings ?? DEFAULT_SETTINGS;
  const mode = settings.mode;
  const key = slot(lang, mode);
  const list = words?.lang === lang && "list" in words ? words.list : null;
  const failed = words?.lang === lang && "failed" in words;
  const day = today ? dayNumber(today) : null;
  const stored = save?.games[key];
  // A daily game from an earlier date is over: today's replaces it
  const game = stored && (mode === "unlimited" || stored.day === day) ? stored : null;
  const state = game ? status(game) : null;
  const dark = settings.theme ? settings.theme === "dark" : systemDark;
  const canType = game !== null && state === "playing" && revealing === null && panel === null;
  const hardLocked = !settings.hard && game !== null && state === "playing" && game.guesses.length > 0;

  // ─── Setup ───

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const firstVisit = readStorage(SAVE_KEY) === null;
    const restored = parseSave(readJson(SAVE_KEY));
    const linkedMode = params.get("mode");
    setSave(isMode(linkedMode) ? { ...restored, settings: { ...restored.settings, mode: linkedMode } } : restored);
    setLang(pickLang({ search: window.location.search, saved: readStorage(LANG_KEY), browser: navigator.languages ?? [navigator.language] }));
    setToday(dateKey(new Date()));
    if (firstVisit) setPanel("help");
  }, []);

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
    loadWords(lang).then(
      (list) => live && setWords({ lang, list }),
      () => live && setWords({ lang, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [lang, today, attempt]);

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

  // Start a game when this language and mode has none yet (or yesterday's)
  const missing = loaded && list !== null && day !== null && game === null;
  useEffect(() => {
    if (!missing || !list || day === null) return;
    let live = true;
    void (async () => {
      const daily = mode === "daily" ? ((lang === "en" ? await fetchDaily(today) : null) ?? dailyAnswer(list.answers, day)) : null;
      if (!live) return;
      setSave((s) => {
        if (!s) return s;
        const existing = s.games[key];
        if (existing && (mode === "unlimited" || existing.day === day)) return s;
        if (daily) return { ...s, games: { ...s.games, [key]: newGame(daily, day) } };
        const recent = s.recent[lang] ?? [];
        const pick = pickAnswer(list.answers, recent);
        return { ...s, games: { ...s.games, [key]: newGame(pick, null) }, recent: { ...s.recent, [lang]: [...recent, pick].slice(-RECENT_LIMIT) } };
      });
    })();
    return () => {
      live = false;
    };
  }, [missing, list, day, today, mode, lang, key]);

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

  const newWord = () => {
    if (!list) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    setPanel(null);
    setSave((s) => {
      if (!s) return s;
      const recent = s.recent[lang] ?? [];
      const pick = pickAnswer(list.answers, recent);
      return { ...s, games: { ...s.games, [slot(lang, "unlimited")]: newGame(pick, null) }, recent: { ...s.recent, [lang]: [...recent, pick].slice(-RECENT_LIMIT) } };
    });
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

  const submit = () => {
    if (!game || !list || revealing !== null || panel) return;
    if (state !== "playing") {
      if (mode === "unlimited") newWord();
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
    const result = status(next);
    setSave((s) => {
      if (!s) return s;
      const stats =
        result === "playing" ? s.stats : { ...s.stats, [key]: recordResult(s.stats[key] ?? EMPTY_STATS, { won: result === "won", tries: next.guesses.length, day: next.day }) };
      return { ...s, games: { ...s.games, [key]: next }, stats };
    });
    setDraft(EMPTY_DRAFT);

    const still = reducedMotion();
    setRevealing(still ? null : row);
    later(
      () => {
        setRevealing(null);
        const marks = evaluate(guess, game.solution);
        setAnnouncement(ui.result(guess, [...guess].map((letter, i) => `${letter.toUpperCase()} ${ui.marks[marks[i]!]}`)));
        if (result === "won") {
          for (let i = 0; i < WORD_LENGTH; i++) animate(row, i, BOUNCE, { duration: BOUNCE_MS, delay: i * BOUNCE_STAGGER_MS });
          toast(ui.wins[row] ?? "", 2_000);
          later(() => setPanel("stats"), still ? 1_200 : BOUNCE_MS + BOUNCE_STAGGER_MS * WORD_LENGTH + 400);
        } else if (result === "lost") {
          // Translated into Danish, "The word was CRANE" said KRAN
          toast(<span translate="no">{ui.lost(game.solution)}</span>, 4_000);
          later(() => setPanel("stats"), 2_400);
        }
      },
      still ? 0 : REVEAL_MS,
    );
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    setSave((s) => s && { ...s, settings: { ...s.settings, mode: next } });
  };

  const changeLang = (next: Lang) => {
    if (next === lang) return;
    cancelReveal();
    setDraft(EMPTY_DRAFT);
    writeStorage(LANG_KEY, next);
    setLang(next);
    // A ?lang= link beats the saved pick, so it's taken out of the address once the player picks
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      window.history.replaceState(null, "", url);
    }
  };

  const changeSettings = (patch: Partial<Settings>) => setSave((s) => s && { ...s, settings: { ...s.settings, ...patch } });

  const setHard = (on: boolean) => {
    if (!(on && hardLocked)) changeSettings({ hard: on });
  };

  /** What to tell the player afterwards, if anything (the share sheet speaks for itself) */
  const share = async (): Promise<string | null> => {
    if (!game) return null;
    const outcome = await shareResult(shareText(game, { lang, dark, contrast: settings.contrast }));
    return outcome === "copied" ? ui.stats.copied : outcome === "failed" ? ui.stats.copyFailed : null;
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
        const letter = toLetter(e.key, lang);
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
  const finished = game !== null && state !== "playing" && revealing === null;

  return (
    <div className="flex h-dvh flex-col">
      <Header ui={ui} lang={lang} mode={mode} ready={loaded} onLang={changeLang} onMode={changeMode} onOpen={setPanel} />

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
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-full bg-[var(--correct)] px-5 py-2 font-bold text-white">
              {ui.retry}
            </button>
          </div>
        ) : (
          <Board
            guesses={shown}
            solution={game?.solution ?? ""}
            draft={state === "playing" ? draft : null}
            showCursor={canType}
            revealing={revealing}
            rowRefs={rows}
            ui={ui}
            onSelect={select}
          />
        )}
        {!game && !failed && today && <p className="sr-only">{ui.loading}</p>}
      </main>

      <div className="flex min-h-14 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-1 text-sm">
        {finished && game && (
          <>
            {state === "lost" && (
              <span className="font-semibold" translate="no">
                {ui.lost(game.solution)}
              </span>
            )}
            {mode === "daily" ? (
              <span className="text-[var(--muted)]">
                {ui.stats.next} <Countdown className="font-semibold text-[var(--fg)] tabular-nums" />
              </span>
            ) : (
              <button type="button" onClick={newWord} className="rounded-full bg-[var(--correct)] px-5 py-2 font-bold text-white">
                {ui.newWord}
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                const note = await share();
                if (note) toast(note);
              }}
              className="rounded-full border-2 border-[var(--tile-filled)] px-4 py-1.5 font-bold"
            >
              {ui.stats.share}
            </button>
          </>
        )}
      </div>

      <Keyboard lang={lang} marks={marks} ui={ui} onLetter={type} onEnter={submit} onBackspace={erase} />

      <Modal open={panel === "help"} title={ui.help.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <HelpPanel ui={ui} />
      </Modal>
      <Modal open={panel === "stats"} title={ui.stats.title} closeLabel={ui.buttons.close} onClose={() => setPanel(null)}>
        <StatsPanel
          ui={ui}
          lang={lang}
          mode={mode}
          stats={save?.stats[key] ?? EMPTY_STATS}
          today={day}
          game={finished ? game : null}
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
          onHard={setHard}
          onDark={(on) => changeSettings({ theme: on ? "dark" : "light" })}
          onContrast={(on) => changeSettings({ contrast: on })}
        />
      </Modal>
    </div>
  );
}
