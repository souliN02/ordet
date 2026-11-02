# Ordet

A daily word game in English and Danish: guess the five-letter word in six tries. Green means the letter is in the right spot, yellow means it's in the word somewhere else, gray means it isn't in the word.

**Play:** [ordet.bekirsaliv.dk](https://ordet.bekirsaliv.dk) · **In Danish:** [ordet.bekirsaliv.dk/?lang=da](https://ordet.bekirsaliv.dk/?lang=da)

## Two modes, two languages

| | English | Danish |
| --- | --- | --- |
| **Daily** | The same word as that day's NYT Wordle, so you can compare with friends who play it | Ordet's own word of the day, the same for everyone |
| **Unlimited** | A new word whenever you finish one | Same |

The daily word changes at the player's own midnight. Each language and mode keeps its own game, streak and statistics, so the Danish daily doesn't break the English streak.

Also in the game: a cursor in the row you're typing (tap a tile or use the arrow keys, Home and End, so a letter you already know can go in its spot first), hard mode (revealed hints must be used), dark and high contrast themes, a Danish keyboard with Æ, Ø and Å, physical keyboard input, spoiler-free sharing (emoji squares), and screen reader announcements for every guess.

`?lang=da` and `?mode=unlimited` open the game in that language or mode.

## How it works

```
app/
  page.tsx            the game (a client component; everything depends on the player's browser)
  api/daily/          GET /api/daily?date=YYYY-MM-DD: the English daily word
components/           Game (state and flow), Board, Keyboard, Header, the three dialogs
data/
  ui.ts               all interface text, English and Danish, typed so Danish can't miss a key
  words/              the word lists (see scripts/words/README.md)
lib/                  pure logic, unit tested: evaluation, hard mode, the row being typed,
                      daily schedule, statistics, sharing, saved state, word loading
scripts/words/        how the word lists were built, and what was left out by hand
```

A few decisions worth knowing about:

- **Evaluation is two passes.** Greens first, then yellows from the letters left over, so a repeated letter is only marked as often as the answer has it (`lib/game.ts`).
- **The English daily word comes from the server.** The Times has no public API, only the JSON its own game loads, and the browser can't read it (CORS). `/api/daily` fetches it for the player's local date, caches it for a day, and falls back to Ordet's own schedule if the request fails. It only answers for dates within a day of today, so it can't be used to look ahead.
- **Danish words are real Danish.** The answers are the most frequent five-letter headwords in DSL's frequency list, checked by hand; every inflected form in Den Danske Ordbog counts as a guess, so *huset* and *bøger* work even though they're never the answer.
- **Saved state is validated.** Progress lives in `localStorage`, which the player controls, so it's parsed field by field and anything malformed is dropped (`lib/save.ts`).
- **Word lists load on demand.** Each language is its own chunk, fetched the first time that language is played.

## Running it

The project uses [pnpm](https://pnpm.io). With Node.js 22+, `corepack enable` sets up the pinned version.

```bash
pnpm install
pnpm dev             # http://localhost:3000
```

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI runs all four on every push and pull request. No environment variables are needed.

## Credits

The Danish word lists are based on [Den Danske Ordbog](https://ordnet.dk/ddo)'s full-form list and the frequency list from [Det Danske Sprog- og Litteraturselskab (DSL)](https://dsl.dk), used under DSL's terms for open language resources. The English lists come from ENABLE (public domain) and [Wordnik's word list](https://github.com/wordnik/wordlist) (MIT). Details are in [scripts/words/README.md](scripts/words/README.md).

Wordle is a trademark of The New York Times Company. Ordet is an independent game and isn't affiliated with or endorsed by the Times or DSL.

The code is available under the MIT License.
