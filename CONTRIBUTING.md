# Contributing

Thanks for looking. Small, single-purpose changes get merged fastest.

## Setup

```bash
composer install
npm install
npm run hooks
npm run build
composer test
npm test
```

`npm run hooks` sets `core.hooksPath` to `.githooks`. Commit messages are
rejected unless every line is a tag line.

## Before you open a PR

```bash
composer test
composer lint
npm run lint:js
npm test
npm run build
```

CI runs the same set on PHP 8.1 and Node 22, plus Plugin Check inside
wp-env, a full-history secret scan, and an ASCII punctuation check.

## The rules that matter here

1. **The token stays sealed.** Do not put an API key, an OAuth token, or the
   raw connection option into a notice, a log line, or the bootstrap JSON.

2. **Disconnect does not delete Arc data.** Clearing the local option stops
   this install. The site and its reports stay in Arc.

3. **ASCII hyphens only.** Use `-` in prose, code, UI copy and commits. No
   `U+2014` em dash, no `U+2013` en dash. CI enforces this.

4. **One version, three places.** `package.json`, the plugin header (including
   `ARC_WORDPRESS_VERSION`), and `Stable tag` in `pendulum-arc/readme.txt`
   move together.

## Tests

```bash
composer test         # PHPUnit, no WordPress load
npm test              # JavaScript unit tests
```

Test deterministic logic, boundaries and user-visible behaviour. Please do
not add tests for trivial accessors, or tests that only assert a mock was
called.

## Commits

Tag-line only. Every line is a tag line; one tag per line; 72 characters or
fewer; no trailing period; no free-form body.

```
[ADD] Show site scores on the WordPress dashboard
[FIX] Seal the connection token before it is stored
[DOC] Describe the Arc hosts the plugin calls
```

Allowed tags: `[ADD]` `[UPD]` `[FIX]` `[DEL]` `[REF]` `[DOC]` `[TST]` `[CFG]`
`[DEP]` `[SEC]` `[PRF]` `[REV]`. Enforced by `.githooks/commit-msg`.

## Releases

Write `docs/releases/vX.Y.Z.md` before you tag. The GitHub Release body is
that file, not auto-generated notes. Format, headings, and the tag sequence
are in [`docs/releasing.md`](docs/releasing.md).

## Reporting bugs

Say what you clicked and what you expected. Do not paste an API key or a
token. For security issues do not open an issue - see [SECURITY.md](SECURITY.md).
