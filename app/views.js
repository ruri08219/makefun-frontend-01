// The four surfaces, each a function from API data to HTML.
// Every link is also a route main.js understands, so each surface is
// reachable by clicking and by its own URL.

import { count, date, esc, feeLabel, money, pot, shorten, stillOpen, timeLeft } from './format.js';

const PAGE_SIZE_BOARD = 12;
const PAGE_SIZE_LEADERBOARD = 25;

/** Pager links for a hash route: `base` + page number, e.g. '#/page/2'. */
function pager(page, pages, base) {
  if (pages <= 1) return '';
  const link = (p, label, current) =>
    current
      ? `<a href="${base}${p}" aria-current="page">${p}</a>`
      : `<a href="${base}${p}">${label}</a>`;
  let out = '<nav class="pager" aria-label="Pages">';
  out += page > 1 ? `<a href="${base}${page - 1}">← Prev</a>` : '<span aria-disabled="true">← Prev</span>';
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out += link(p, p, p === page);
    else if (Math.abs(p - page) === 2) out += '<span aria-disabled="true">…</span>';
  }
  out += page < pages ? `<a href="${base}${page + 1}">Next →</a>` : '<span aria-disabled="true">Next →</span>';
  return `${out}</nav>`;
}

/** One board row: title, live pot, fee, time left, entries. */
function boardRow(b) {
  const open = stillOpen(b);
  const left = timeLeft(b.deadline);
  return `<li class="card">
    <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
    <div class="meta">
      <span class="pot">${pot(b)}</span>
      <span class="fee">${feeLabel(b)}</span>
      <span class="${open && left.endsWith('m left') ? 'ending' : ''}">${open ? left : 'ended'}</span>
      <span>${count(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
      <span class="tag">${esc(b.category ?? 'Bounty')}</span>
    </div>
    ${b.summary ? `<p class="desc">${esc(shorten(b.summary, 180))}</p>` : ''}
  </li>`;
}

/** The bounty board, with search, filters, sort and paging — all client-side, no refetch. */
export function board(items, state) {
  const q = state.q.trim().toLowerCase();
  let rows = items.filter((b) => stillOpen(b));
  if (state.filter === 'free') rows = rows.filter((b) => Number(b.entryFeeUsd) <= 0);
  if (state.filter === 'paid') rows = rows.filter((b) => Number(b.entryFeeUsd) > 0);
  if (state.filter === 'ending') {
    rows = rows.filter((b) => new Date(b.deadline).getTime() - Date.now() < 86400000);
  }
  if (q) {
    rows = rows.filter((b) =>
      `${b.title} ${b.slug} ${b.category ?? ''} ${b.summary ?? ''}`.toLowerCase().includes(q),
    );
  }
  const sorts = {
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    entries: (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
  };
  rows = [...rows].sort(sorts[state.sort] ?? sorts.deadline);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE_BOARD));
  const page = Math.min(state.page, pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE_BOARD, page * PAGE_SIZE_BOARD);
  const option = (value, label) =>
    `<option value="${value}"${state.filter === value ? ' selected' : ''}>${label}</option>`;
  const sortOption = (value, label) =>
    `<option value="${value}"${state.sort === value ? ' selected' : ''}>${label}</option>`;
  return `<h1>Open bounties</h1>
  <p class="lede">${count(items.filter(stillOpen).length)} bounties taking entries now — live pots, fees and deadlines from make.fun's public API.</p>
  <form class="controls" id="board-controls" action="#/" method="get">
    <label class="small" for="q">Search</label>
    <input type="search" id="q" name="q" value="${esc(state.q)}" placeholder="Search bounties…" autocomplete="off">
    <label class="small" for="filter">Show</label>
    <select id="filter" name="filter">
      ${option('all', 'All open')}
      ${option('free', 'Free entry')}
      ${option('paid', 'Paid entry')}
      ${option('ending', 'Ending in 24h')}
    </select>
    <label class="small" for="sort">Sort</label>
    <select id="sort" name="sort">
      ${sortOption('deadline', 'Ending soonest')}
      ${sortOption('pot', 'Biggest pot')}
      ${sortOption('entries', 'Most entries')}
      ${sortOption('title', 'Title A–Z')}
    </select>
    <span class="count">${count(rows.length)} shown</span>
  </form>
  ${shown.length ? `<ul class="cards">${shown.map(boardRow).join('')}</ul>` : '<p class="notice">No bounties match — clear the search or pick another filter.</p>'}
  ${pager(page, pages, '#/page/')}`;
}

/** The rewards table: each place and its prize, with the live pot split. */
function rewardsTable(bounty) {
  const rewards = bounty.rewards ?? {};
  const places = Object.keys(rewards).map(Number).sort((a, b) => a - b);
  if (!places.length) return '';
  const feeTotal = Number(bounty.entryFeesUsd ?? 0);
  const rewardTotal = Number(bounty.rewardAmount ?? 0);
  const rows = places
    .map((place) => {
      const prize = Number(rewards[place]);
      const share = feeTotal > 0 && rewardTotal > 0 ? money((feeTotal * prize) / rewardTotal) : '—';
      return `<tr><td class="rank">${place}</td><td class="num">${money(prize)}</td><td class="num muted">${share === '—' ? '—' : `+ ${share} fees`}</td></tr>`;
    })
    .join('');
  return `<h2>Rewards</h2>
  <p class="small muted">Live pot ${pot(bounty)} — $${money(bounty.rewardAmount)} reward${feeTotal > 0 ? ` + ${money(feeTotal)} entry fees paid in` : ''}, split over the places below.</p>
  <table>
    <caption>Prize per place</caption>
    <thead><tr><th>Place</th><th class="num">Prize</th><th class="num">Share of fees</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** One bounty's page: summary, facts, rewards, description, leaderboard link. */
export function bounty(b) {
  const open = stillOpen(b);
  return `<p><a class="back" href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  ${b.summary ? `<p class="lede">${esc(b.summary)}</p>` : ''}
  <dl class="facts">
    <div class="fact"><dt>Live pot</dt><dd class="pot">${pot(b)}</dd></div>
    <div class="fact"><dt>Entry fee</dt><dd>${feeLabel(b)}</dd></div>
    <div class="fact"><dt>Deadline</dt><dd>${date(b.deadline)}</dd></div>
    <div class="fact"><dt>Time left</dt><dd>${open ? timeLeft(b.deadline) : 'Ended'}</dd></div>
    <div class="fact"><dt>Entries</dt><dd>${count(b.submissionCount)}</dd></div>
    <div class="fact"><dt>Status</dt><dd>${open ? 'Open' : 'Closed'}</dd></div>
  </dl>
  <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a></p>
  ${rewardsTable(b)}
  ${b.description ? `<h2>Description</h2><div class="description">${esc(b.description)}</div>` : ''}`;
}

/** One bounty's leaderboard: rank, entrant, title and the competition's own score columns, paged. */
export function leaderboard(lb, page) {
  const columns = (lb.columns ?? []).filter((c) => !c.hidden).slice(0, 4);
  const entries = lb.entries ?? [];
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE_LEADERBOARD));
  const safePage = Math.min(page, pages);
  const shown = entries.slice((safePage - 1) * PAGE_SIZE_LEADERBOARD, safePage * PAGE_SIZE_LEADERBOARD);
  const slug = lb.competition?.slug ?? '';
  const head = `<th>Rank</th><th>Entrant</th>${columns.map((c) => `<th class="num">${esc(c.title)}</th>`).join('')}`;
  const rows = shown
    .map((e) => {
      const avatar = e.image ? `https://make.fun${e.image}` : '';
      const name = e.handle ? `<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>` : '—';
      const cells = columns
        .map((c) => `<td class="num">${esc(e.display?.[c.key] ?? e.values?.[c.key] ?? '—')}</td>`)
        .join('');
      return `<tr><td class="rank">${count(e.rank)}</td><td>${avatar ? `<img class="avatar" crossorigin="anonymous" src="${esc(avatar)}" alt="" loading="lazy">` : ''}${name}<br><span class="small muted">${esc(shorten(e.title ?? '', 60))}</span></td>${cells}</tr>`;
    })
    .join('');
  return `<p><a class="back" href="#/bounty/${encodeURIComponent(slug)}">← ${esc(lb.competition?.title ?? slug)}</a></p>
  <h1>${esc(lb.title ?? 'Leaderboard')}</h1>
  <p class="lede">${esc(lb.competition?.title ?? '')} — ${count(entries.length)} entries${lb.phase?.title ? ` · ${esc(lb.phase.title)} phase` : ''}.</p>
  ${entries.length ? `<table><caption>Top entries, page ${safePage} of ${pages}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>` : '<p class="notice">No entries yet — be the first.</p>'}
  ${pager(safePage, pages, `#/bounty/${encodeURIComponent(slug)}/leaderboard/page/`)}`;
}

/** One account's public profile: avatar, bio, record and entries. */
export function profile(p) {
  const avatar = p.avatar?.url ? `https://make.fun${p.avatar.url}` : p.image ? `https://make.fun${p.image}` : '';
  const record = p.record ?? {};
  const solutions = p.solutions ?? [];
  const stat = (value, label) => `<div class="stat"><b>${count(value)}</b><span>${label}</span></div>`;
  const rows = solutions
    .map((s) => {
      const c = s.competition ?? {};
      const place = s.placement ? `#${count(s.placement)}` : '—';
      const prize = s.prize_usd ? money(s.prize_usd) : '';
      return `<tr><td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title ?? c.slug ?? '')}</a><br><span class="small muted">${esc(shorten(s.title ?? '', 60))}</span></td><td class="num">${place}</td><td class="num">${prize}</td></tr>`;
    })
    .join('');
  return `<div class="profile-head">
    ${avatar ? `<img class="avatar-big" crossorigin="anonymous" src="${esc(avatar)}" alt="Avatar of ${esc(p.display_name ?? p.handle)}">` : ''}
    <div>
      <h1>${esc(p.display_name ?? p.handle)}</h1>
      <p class="handle">@${esc(p.handle)}${p.github_login ? ` · GitHub ${esc(p.github_login)}` : ''}</p>
    </div>
  </div>
  ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
  <div class="stats" role="list">
    ${stat(record.competitions_entered, 'Entered')}
    ${stat(record.competitions_placed, 'Placed')}
    ${stat(record.competitions_won, 'Won')}
    ${stat(record.podium_finishes, 'Podiums')}
    <div class="stat"><b>${money(record.prize_usd ?? 0)}</b><span>Prize money</span></div>
  </div>
  <h2>Entries</h2>
  ${solutions.length ? `<table><caption>${count(solutions.length)} entries</caption><thead><tr><th>Bounty</th><th class="num">Place</th><th class="num">Prize</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="notice">No entries yet.</p>'}`;
}
