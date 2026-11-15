# make.fun bounties — a fast, lightweight frontend

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/ruri08219/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/ruri08219/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fully working make.fun frontend made of static files — no build step, no
framework — reading make.fun's public API alone. Built for the
[make.fun bounty "Build the best make.fun frontend"](https://make.fun/bounty/makefun-frontend-01).

## What it shows

Four surfaces, each reachable by a link and by its own URL:

- `#/` — the live bounty board: each bounty's live pot, entry fee, time left
  and entries, with search, filters and sorting
- `#/bounty/<slug>` — a bounty's page: summary, description, rules, the
  rewards table with the live pot, dates and status
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard, paginated
- `#/u/<handle>` — an account's public profile: bio, record and entries

A bounty past its deadline may still read "open" until its results are
published, so open-ness is judged by the deadline, not the status alone.
Read-only: no sign-in, no writes.

## Why it is fast

- First load is 6 files, ~8.5 KB gzipped: one HTML page, one stylesheet and
  four small ES modules; no framework, no webfonts.
- API answers are cached in memory and revalidated with `If-None-Match`
  (the API's ETags are bound to the minute, so a revalidation inside the
  same minute answers 304 with no body).
- Long lists are paginated (12 bounties, 25 leaderboard rows a page);
  filtering and sorting the board costs no extra request.
- One API request per view, at most.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser.

## Hand in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-frontend.ts` (the kit's copy, unchanged):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of the running app on live
make.fun data; the first by name is the cover. `shots.json` names each
shot's route and viewport.

## License

MIT — see [LICENSE](LICENSE).
