# make.fun frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/ruri08219/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/ruri08219/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, lean, fully working frontend for [make.fun](https://make.fun) — static files, no build step, no framework — built for the [makefun-frontend-01 bounty](https://make.fun/bounty/makefun-frontend-01) ("Build the best make.fun frontend", $500, top 20 share).

## What it does

Four surfaces, each reachable by a link and by its own URL, all on make.fun's public API (read-only GET, CORS open):

- **Bounty board** — `#/` — live bounties with live pot, entry fee, time left and entries; search, free/paid/ending-soon filters, sort by deadline / pot / entries / title, 12 per page.
- **Bounty page** — `#/bounty/<slug>` — summary, live pot, fee, deadline, entries, rewards table with the live pot split (reward + entry fees), and description.
- **Leaderboard** — `#/bounty/<slug>/leaderboard` — the competition's own score columns, 25 entries per page, entrant avatars linking to profiles.
- **Profile** — `#/u/<handle>` — avatar, bio, record (entered / placed / won / podiums / prize money) and entries with placements.

## Performance

- **One API request per view, at most.** Answers are cached in memory and revalidated with `If-None-Match` (the API's ETags are bound to the minute: a same-minute revisit answers 304 with no body). Filtering, sorting and paging are all client-side on data already fetched.
- **Small first load:** `index.html` + one stylesheet + five small ES modules, no framework — see the dossier's Load block.
- **Accessible:** skip link, landmarks, labelled controls, focus-visible styles, phone layout.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser. To hand it in:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/` — the frontend: `index.html`, `style.css`, `main.js` (router), `views.js` (the four surfaces), `api.js` (cached public-API client), `format.js`
- `screenshots/` — 3 screenshots of the running app on live data (board, bounty page, leaderboard)
- `main.ts` — copies `app/` + `screenshots/` to `/output` and writes `dossier.json` via `vendor/makefun-frontend.ts`
- `serve.ts` — tiny static server for local testing

## License

MIT — see [LICENSE](LICENSE).
