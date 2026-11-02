# Word lists

`data/words/en.ts` and `data/words/da.ts` each export two lists:

- `ANSWERS`: the words the game can pick. Common base forms only (no plurals or past tenses), checked by hand.
- `GUESSES`: every other word the game accepts as a guess.

## Sources

| Language | Answers | Guesses |
| --- | --- | --- |
| English | Five-letter words from [ENABLE](https://github.com/dolph/dictionary) (public domain) used often enough according to [wordfreq](https://github.com/rspeer/wordfreq), minus inflected forms and the words in `skip-en.txt` | ENABLE plus [Wordnik's word list](https://github.com/wordnik/wordlist) (MIT) and `extra-en.txt`, minus `block-en.txt` |
| Danish | The most frequent five-letter headwords in DSL's [frequency list](https://korpus.dsl.dk/resources/details/freq-lemmas.html), minus the words in `skip-da.txt` | Every five-letter form in [Den Danske Ordbog's full-form list](https://korpus.dsl.dk/resources/details/ddo-fullforms.html), minus `block-da.txt` |

The Danish lists are based on language resources from [Det Danske Sprog- og Litteraturselskab (DSL)](https://dsl.dk), used under [DSL's terms for open language resources](https://korpus.dsl.dk/resources/licences/dsl-open.html). DSL doesn't endorse this game.

## Regenerating

`build.py` produced the first version of both files:

```bash
pip install wordfreq
python scripts/words/build.py --enable enable1.txt --wordnik wordlist-20210729.txt \
  --ddo ddo-fullforms_251126.csv --dsl-freq freq-30k-ex.txt --out data/words
```

Don't rerun it on a live site. The daily word is `ANSWERS[day % ANSWERS.length]`, so reshuffling or removing an answer changes the words already scheduled. Edit the generated files by hand instead: add new answers at the end of `ANSWERS`, replace a bad answer in place with another word (which changes only that day), and add or remove guesses anywhere in `GUESSES`.
