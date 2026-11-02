"""
Builds data/words/en.ts and data/words/da.ts from the sources listed in README.md.

    python scripts/words/build.py --enable enable1.txt --wordnik wordlist-20210729.txt \
        --ddo ddo-fullforms_251126.csv --dsl-freq freq-30k-ex.txt --out data/words

This made the first version of the lists. Since then the generated files are the
source of truth: the daily word is ANSWERS[day % length], so rerunning this script
(which reshuffles) or removing an answer would change the words already scheduled.
Add new answers by hand at the end of ANSWERS instead.

Needs `pip install wordfreq` for the English frequencies.
"""

import argparse
import random
import re
from pathlib import Path

from wordfreq import zipf_frequency

HERE = Path(__file__).parent
SEED = "ordet"
EN_MIN_ZIPF = 2.6  # roughly the 3,500 most common five-letter words before filtering
DA_TOP_LEMMAS = 1700  # how far down DSL's frequency list answers may come from
# DSL tags that are parts of words, numerals or the "unique" at/som/der
DA_SKIP_TAGS = {"EW", "M", "NW", "LW", "AW", "U", "L"}

EN_WORD = re.compile(r"[a-z]{5}")
DA_WORD = re.compile(r"[a-zæøå]{5}")


def word_file(name: str) -> set[str]:
    """One or more words per line; # starts a comment."""
    words: set[str] = set()
    for line in (HERE / name).read_text(encoding="utf-8").splitlines():
        words.update(line.split("#", 1)[0].split())
    return words


def english_inflection(word: str, dictionary: set[str]) -> bool:
    """Plurals, -ed and -ing forms of a shorter word. Answers are base forms."""
    if word.endswith("s") and not word.endswith("ss"):
        if word[:-1] in dictionary or (word.endswith("es") and word[:-2] in dictionary):
            return True
        if word.endswith("ies") and word[:-3] + "y" in dictionary:
            return True
    if word.endswith("ed"):
        if word[:-1] in dictionary or word[:-2] in dictionary:
            return True
        if word.endswith("ied") and word[:-3] + "y" in dictionary:
            return True
        if word[-3] == word[-4] and word[:-3] in dictionary:
            return True
    if word.endswith("ing") and (word[:-3] in dictionary or word[:-3] + "e" in dictionary):
        return True
    return False


def english(enable_path: Path, wordnik_path: Path) -> tuple[list[str], list[str]]:
    enable = {w.strip() for w in enable_path.read_text(encoding="utf-8").splitlines()}
    wordnik = {w.strip().strip('"') for w in wordnik_path.read_text(encoding="utf-8").splitlines()}
    blocked = word_file("block-en.txt")
    skipped = word_file("skip-en.txt")

    accepted = {w for w in enable | wordnik | word_file("extra-en.txt") if EN_WORD.fullmatch(w)} - blocked
    answers = sorted(
        w
        for w in enable
        if EN_WORD.fullmatch(w)
        and zipf_frequency(w, "en") >= EN_MIN_ZIPF
        and not english_inflection(w, enable)
        and w not in skipped | blocked
    )
    return answers, sorted(accepted - set(answers))


def danish(ddo_path: Path, freq_path: Path) -> tuple[list[str], list[str]]:
    blocked = word_file("block-da.txt")
    skipped = word_file("skip-da.txt")

    # DDO's full-form list: form, lemma, homograph number, part of speech, id
    forms: set[str] = set()
    headwords: set[str] = set()
    for line in ddo_path.read_text(encoding="utf-8").splitlines():
        cols = line.split("\t")
        if len(cols) < 4 or not DA_WORD.fullmatch(cols[0]):
            continue
        forms.add(cols[0])
        if cols[0] == cols[1]:
            headwords.add(cols[0])

    # DSL's 30,000 most frequent lemmas (without names and numerals): tag, lemma, frequency
    ranked: list[str] = []
    for line in freq_path.read_text(encoding="utf-8").splitlines():
        tag, lemma, _ = line.split("\t")
        if DA_WORD.fullmatch(lemma) and lemma in headwords and tag not in DA_SKIP_TAGS:
            ranked.append(lemma)
    common = dict.fromkeys(ranked[:DA_TOP_LEMMAS])  # ordered, deduplicated

    answers = sorted(w for w in common if w not in skipped | blocked)
    return answers, sorted(forms - blocked - set(answers))


def shuffled(words: list[str]) -> list[str]:
    out = list(words)
    random.Random(SEED).shuffle(out)
    return out


def wrapped(words: list[str], per_line: int = 12) -> str:
    return "\n".join(" ".join(words[i : i + per_line]) for i in range(0, len(words), per_line))


def module(header: str, answers: list[str], guesses: list[str]) -> str:
    return f"""{header}

const words = (list: string) => list.trim().split(/\\s+/);

/** The answers in daily order: day n plays ANSWERS[n % ANSWERS.length], so only ever add words at the end */
export const ANSWERS = words(`
{wrapped(answers)}
`);

/** Every other accepted guess */
export const GUESSES = words(`
{wrapped(guesses)}
`);
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--enable", type=Path, required=True)
    parser.add_argument("--wordnik", type=Path, required=True)
    parser.add_argument("--ddo", type=Path, required=True)
    parser.add_argument("--dsl-freq", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    en_answers, en_guesses = english(args.enable, args.wordnik)
    da_answers, da_guesses = danish(args.ddo, args.dsl_freq)

    en_header = (
        "// English words for Ordet, generated by scripts/words/build.py.\n"
        "// Answers: common five-letter base forms from ENABLE (public domain), checked by hand.\n"
        "// Guesses: ENABLE plus Wordnik's word list (MIT, github.com/wordnik/wordlist)."
    )
    da_header = (
        "// Danske ord til Ordet, generated by scripts/words/build.py.\n"
        "// Based on Den Danske Ordbog's full-form list and frequency list from\n"
        "// Det Danske Sprog- og Litteraturselskab (DSL, dsl.dk), used under DSL's open terms.\n"
        "// Answers: the most frequent five-letter headwords, checked by hand. Guesses: every DDO form."
    )
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "en.ts").write_text(module(en_header, shuffled(en_answers), en_guesses), encoding="utf-8", newline="\n")
    (args.out / "da.ts").write_text(module(da_header, shuffled(da_answers), da_guesses), encoding="utf-8", newline="\n")
    print(f"en: {len(en_answers)} answers, {len(en_guesses)} more guesses")
    print(f"da: {len(da_answers)} answers, {len(da_guesses)} more guesses")


if __name__ == "__main__":
    main()
