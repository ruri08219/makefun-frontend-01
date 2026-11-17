# make.fun, lean

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/ruri08219/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/ruri08219/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only frontend for [make.fun](https://make.fun), built for the
[bounty "Build the best make.fun frontend"](https://make.fun/bounty/makefun-frontend-01).
Static files, no build step, no framework — it only `GET`s make.fun's public
API and renders four surfaces, each reachable by a link and by its own URL:

- **Board** — `#/` — live bounties with each one's live pot, entry fee,
  time left and entry count; search, filters (ending soon / free / paid),
  sorting and 12-per-page pagination.
- **Bounty page** — `#/bounty/<slug>` — summary, live pot, entry fee,
  deadline and open/closed status judged by the deadline, the rewards table
  with the live pot split (base + fee share), dates and the latest entries.
- **Leaderboard** — `#/bounty/<slug>/leaderboard` — ranked entries with
  judge win rate, its 90% interval and build cost.
- **Profile** — `#/u/<handle>` — avatar, bio, wallet, record
  (entered / placed / won / prize money) and the account's entries.

## Why it is fast

- First load is three tiny files (page, stylesheet, boot module); the view
  code loads lazily on the first route.
- API answers are cached in memory and revalidated with `If-None-Match`,
  so a repeat view costs no request or a 304 with no body — at most one
  real request per view.
- Long lists are paginated (12 bounties, 25 leaderboard rows per page);
  views update without rebuilding the page.

## Run it

```sh
node serve.ts          # serves app/ on http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-frontend.ts` library. The three screenshots in `screenshots/`
are real renders of this app on live make.fun data; the first by name is the
cover.

## License

MIT — see [LICENSE](LICENSE).
