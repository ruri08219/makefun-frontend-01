// The four pages, each a function from API data to HTML. All values are
// escaped; links are the only way between surfaces, and every surface has
// its own hash URL, so each is reachable by link and by address.

import { date, entries, esc, isOpen, money, score, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} entry fee` : 'Free entry');

/** Open / closed badge, judged by the deadline, not the status alone. */
const badge = (b) =>
  isOpen(b)
    ? '<span class="badge open">Open</span>'
    : '<span class="badge closed">Closed</span>';

const PAGE_SIZE = 12;

/** Board controls: search, filter, sort. Values come from the board state in main.js. */
export function boardControls(state) {
  const { q, filter, sort } = state;
  return `<form class="controls" id="board-controls" role="search" aria-label="Filter bounties">
    <label>Search <input type="search" name="q" value="${esc(q)}" placeholder="Title or slug" aria-label="Search bounties by title"></label>
    <label>Show
      <select name="filter" aria-label="Filter bounties">
        <option value="all"${filter === 'all' ? ' selected' : ''}>All open bounties</option>
        <option value="ending"${filter === 'ending' ? ' selected' : ''}>Ending within 24 hours</option>
        <option value="free"${filter === 'free' ? ' selected' : ''}>Free entry</option>
        <option value="paid"${filter === 'paid' ? ' selected' : ''}>Paid entry</option>
      </select>
    </label>
    <label>Sort by
      <select name="sort" aria-label="Sort bounties">
        <option value="pot"${sort === 'pot' ? ' selected' : ''}>Largest pot</option>
        <option value="deadline"${sort === 'deadline' ? ' selected' : ''}>Soonest deadline</option>
        <option value="entries"${sort === 'entries' ? ' selected' : ''}>Most entries</option>
      </select>
    </label>
  </form>`;
}

/** Filter + sort the board client-side, so a control change costs no request. */
export function filterBoard(items, state) {
  const q = state.q.trim().toLowerCase();
  let rows = items.filter((b) => {
    if (q && !(b.title + ' ' + b.slug).toLowerCase().includes(q)) return false;
    if (state.filter === 'ending') return isOpen(b) && new Date(b.deadline).getTime() - Date.now() < 86400000;
    if (state.filter === 'free') return !b.entryFeeUsd;
    if (state.filter === 'paid') return !!b.entryFeeUsd;
    return true;
  });
  const key =
    state.sort === 'deadline'
      ? (b) => new Date(b.deadline).getTime()
      : state.sort === 'entries'
        ? (b) => -(b.submissionCount || 0)
        : (b) => -(Number(b.potUsd ?? b.rewardAmount) || 0);
  rows = rows.slice().sort((a, b) => key(a) - key(b));
  return rows;
}

/** One page of rows, with a pager. Page numbers are links, so a page is shareable. */
function pager(page, pages, base) {
  if (pages <= 1) return '';
  let links = '';
  for (let p = 1; p <= pages; p++) {
    links +=
      p === page
        ? `<span class="page current" aria-current="page">${p}</span>`
        : `<a class="page" href="${base}${p}">${p}</a>`;
  }
  return `<nav class="pager" aria-label="Pages">${links}</nav>`;
}

export function board(data, state) {
  const rows = filterBoard(data.items, state);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), pages);
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const list = slice
    .map(
      (b) => `
      <li class="card">
        <a class="card-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <p class="card-meta">${badge(b)} <span>${esc(b.category || '')}</span></p>
        <dl class="facts">
          <div><dt>Pot</dt><dd>${pot(b)}</dd></div>
          <div><dt>Entry</dt><dd>${fee(b)}</dd></div>
          <div><dt>Time left</dt><dd>${timeLeft(b.deadline)}</dd></div>
          <div><dt>Entries</dt><dd>${entries(b.submissionCount)}</dd></div>
        </dl>
        <p class="card-links"><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
      </li>`,
    )
    .join('');
  return `<h1>Open bounties</h1>
    <p class="lede">${rows.length} ${rows.length === 1 ? 'bounty' : 'bounties'} · pots include every entry fee paid so far.</p>
    ${boardControls(state)}
    <p role="status">${rows.length ? `Showing ${slice.length} of ${rows.length}.` : 'No bounties match these filters.'}</p>
    <ul class="board">${list}</ul>
    ${pager(page, pages, '#/page/')}`;
}

/** The rewards table, with the live pot split over the places. */
function rewardsTable(b) {
  const rows = (b.rewardsNow || []).map(
    (r) => `<tr><td>${r.place}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><strong>${money(r.amountUsd)}</strong></td></tr>`,
  );
  if (!rows.length) return '<p>The rewards table is published once entries open.</p>';
  return `<table>
    <caption>Rewards — the live pot split over the paid places</caption>
    <thead><tr><th scope="col">Place</th><th scope="col">Prize</th><th scope="col">Fee share</th><th scope="col">Total now</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export function bounty(b) {
  const subs = (b.submissions || []).slice(0, 10);
  const subList = subs.length
    ? `<ul class="subs">${subs
        .map(
          (s) => `<li><a href="#/u/${encodeURIComponent(s.hunter)}">${esc(s.hunter)}</a> — ${esc(s.title || 'Untitled entry')}</li>`,
        )
        .join('')}</ul>`
    : '<p>No entries yet.</p>';
  return `
    <p><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary || '')}</p>
    <p>${badge(b)} <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a> · <a href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">View on make.fun</a></p>
    <dl class="facts big">
      <div><dt>Live pot</dt><dd><strong>${pot(b)}</strong></dd></div>
      <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
      <div><dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd></div>
      <div><dt>Opens</dt><dd>${date(b.opensAt || b.publishedAt)}</dd></div>
      <div><dt>Entries</dt><dd>${entries(b.submissionCount)}</dd></div>
      <div><dt>Status</dt><dd>${isOpen(b) ? 'Open — still taking entries' : 'Closed — past its deadline'}</dd></div>
    </dl>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <h2>Description</h2>
    <div class="description">${esc(b.description)}</div>
    ${b.rules ? `<details><summary>Rules</summary><div class="description">${esc(b.rules)}</div></details>` : ''}
    <h2>Recent entries</h2>
    ${subList}`;
}

const LB_SIZE = 25;

export function leaderboard(lb, slug, page) {
  const cols = (lb.columns || []).filter((c) => !c.hidden);
  const rankCol = lb.columns?.find((c) => c.key === lb.rank_key) || cols[0];
  const list = lb.entries || [];
  const pages = Math.max(1, Math.ceil(list.length / LB_SIZE));
  const p = Math.min(Math.max(1, page), pages);
  const slice = list.slice((p - 1) * LB_SIZE, p * LB_SIZE);
  const head = `<tr><th scope="col">#</th><th scope="col">Entrant</th><th scope="col">Entry</th>${rankCol ? `<th scope="col">${esc(rankCol.title)}</th>` : ''}</tr>`;
  const rows = slice
    .map((e) => {
      const value = rankCol ? score(e.display?.[rankCol.key] ?? e.values?.[rankCol.key], rankCol.precision) : '—';
      const img = e.image
        ? `<img crossorigin="anonymous" src="https://make.fun${esc(e.image)}" alt="" width="40" height="40" loading="lazy">`
        : '';
      return `<tr>
        <td>${e.rank}</td>
        <td><a class="who" href="#/u/${encodeURIComponent(e.handle)}">${img}<span>${esc(e.handle)}</span></a></td>
        <td>${esc(e.title || '')}</td>
        <td>${value}</td>
      </tr>`;
    })
    .join('');
  return `
    <p><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(lb.competition?.title || slug)}</a></p>
    <h1>Leaderboard: ${esc(lb.competition?.title || slug)}</h1>
    <p class="lede">${list.length ? `${list.length} ranked ${list.length === 1 ? 'entry' : 'entries'} · ${esc(lb.title || '')}` : 'No entries ranked yet — the board fills once entries are judged.'}</p>
    ${list.length ? `<table><thead>${head}</thead><tbody>${rows}</tbody></table>${pager(p, pages, `#/bounty/${encodeURIComponent(slug)}/leaderboard/page/`)}` : ''}`;
}

export function profile(p) {
  const img = p.avatar?.url || p.image;
  const rec = p.record || {};
  const sols = (p.solutions || []).map(
    (s) => `<li>
      <a href="#/bounty/${encodeURIComponent(s.competition.slug)}">${esc(s.competition.title)}</a>
      <span> — ${esc(s.title || '')}</span>
      <span class="dim">${s.score ? ` · score ${esc(s.score.display)}` : ''}${s.placement ? ` · place ${s.placement}` : ''}${s.prize_usd ? ` · ${money(s.prize_usd)} won` : ''}</span>
    </li>`,
  );
  return `
    <p><a href="#/">← All bounties</a></p>
    <article class="profile">
      ${img ? `<img class="avatar" crossorigin="anonymous" src="https://make.fun${esc(img)}" alt="Avatar of ${esc(p.handle)}" width="96" height="96">` : ''}
      <h1>${esc(p.display_name || p.handle)}</h1>
      <p class="handle">@${esc(p.handle)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      <dl class="facts big">
        <div><dt>Entered</dt><dd>${rec.competitions_entered ?? 0} competitions</dd></div>
        <div><dt>Placed</dt><dd>${rec.competitions_placed ?? 0}</dd></div>
        <div><dt>Won</dt><dd>${rec.competitions_won ?? 0}</dd></div>
        <div><dt>Prize money</dt><dd>${money(rec.prize_usd ?? 0)}</dd></div>
        <div><dt>Joined</dt><dd>${date(p.joined_at)}</dd></div>
      </dl>
      <h2>Entries (${(p.solutions || []).length})</h2>
      ${sols.length ? `<ul class="subs">${sols.join('')}</ul>` : '<p>No entries yet.</p>'}
    </article>`;
}

/** A plain error page, with a way back. */
export function errorPage(message) {
  return `<h1>Something went wrong</h1><p>${esc(message)}</p><p><a href="#/">Back to the board</a></p>`;
}
