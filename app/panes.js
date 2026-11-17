// panes.js — the four surfaces, each a renderer that fetches at most once
// (net.js caches) and paints #stage. Loaded lazily by boot.js so the first
// load stays small; the board, bounty, leaderboard and profile live here.

import { account, boardPage, bounty, getJson, standings } from './net.js';
import {
  ago,
  dayMonth,
  dollars,
  esc,
  prose,
  stillOpen,
  timeLeft,
  whole,
  winRate,
} from './fmt.js';

const stage = document.getElementById('stage');
const PAGE_SIZE = 12;

function paint(html) {
  stage.innerHTML = html;
  window.__shotReady = true;
}

function failed(err) {
  const code = err && err.status ? ` (${err.status})` : '';
  paint(
    `<section class="notice"><h1>Couldn&rsquo;t load that</h1>` +
      `<p>make.fun answered${esc(code)} — check the address and try again.</p>` +
      `<p><a href="#/">Back to the board</a></p></section>`,
  );
}

function bountyCard(b) {
  const open = stillOpen(b);
  const fee = b.entryFeeUsd == null ? 'Free' : dollars(b.entryFeeUsd) + ' fee';
  return (
    `<article class="card">
      <h2><a href="#/bounty/${esc(b.slug)}">${esc(b.title)}</a></h2>
      <p class="card-sub">${esc(b.category || '')} · ${whole(b.submissionCount)} entries</p>
      <p class="card-pot"><strong>${dollars(b.potUsd ?? b.rewardAmount)}</strong>
        <span>live pot</span></p>
      <ul class="card-meta">
        <li>${esc(fee)}</li>
        <li>${esc(timeLeft(b.deadline))}</li>
        <li>${open ? '<span class="open">Open</span>' : '<span class="shut">Closed</span>'}</li>
      </ul>
      <p class="card-links">
        <a href="#/bounty/${esc(b.slug)}">Bounty</a> ·
        <a href="#/bounty/${esc(b.slug)}/leaderboard">Leaderboard</a>
      </p>
    </article>`
  );
}

function readBoardQuery(raw) {
  const q = new URLSearchParams(raw || '');
  return {
    page: Math.max(1, Number(q.get('page')) || 1),
    text: (q.get('q') || '').trim().toLowerCase(),
    filter: q.get('f') || 'all',
    sort: q.get('sort') || 'pot',
  };
}

function boardLink(state, patch) {
  const next = { ...state, ...patch };
  const q = new URLSearchParams();
  if (next.page > 1) q.set('page', String(next.page));
  if (next.text) q.set('q', next.text);
  if (next.filter !== 'all') q.set('f', next.filter);
  if (next.sort !== 'pot') q.set('sort', next.sort);
  const tail = q.toString();
  return '#/' + (tail ? '?' + tail : '');
}

export async function renderBoard(rawQuery) {
  window.__shotReady = false;
  const state = readBoardQuery(rawQuery);
  let data;
  try {
    data = await boardPage(100);
  } catch (err) {
    failed(err);
    return;
  }
  let list = (data.items || []).slice();
  if (state.filter === 'soon') {
    list = list.filter(
      (b) => new Date(b.deadline).getTime() - Date.now() < 48 * 3600_000,
    );
  } else if (state.filter === 'free') {
    list = list.filter((b) => b.entryFeeUsd == null);
  } else if (state.filter === 'paid') {
    list = list.filter((b) => b.entryFeeUsd != null);
  }
  if (state.text) {
    list = list.filter((b) =>
      `${b.title} ${b.slug} ${b.category || ''}`
        .toLowerCase()
        .includes(state.text),
    );
  }
  const sorts = {
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
    new: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  };
  list.sort(sorts[state.sort] || sorts.pot);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(state.page, pages);
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const potTotal = list.reduce(
    (sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0),
    0,
  );

  const chips = ['all', 'soon', 'free', 'paid']
    .map(
      (f) =>
        `<a class="chip${state.filter === f ? ' on' : ''}" href="${boardLink(state, { f, page: 1 })}">${f === 'all' ? 'All' : f === 'soon' ? 'Ending soon' : f === 'free' ? 'Free entry' : 'Paid entry'}</a>`,
    )
    .join('');
  const sortsHtml = ['pot', 'deadline', 'entries', 'new']
    .map(
      (s) =>
        `<option value="${s}"${state.sort === s ? ' selected' : ''}>${{ pot: 'Biggest pot', deadline: 'Ending first', entries: 'Most entries', new: 'Newest' }[s]}</option>`,
    )
    .join('');

  paint(
    `<section>
      <div class="pagehead">
        <h1>Live bounties</h1>
        <p>${whole(list.length)} open · ${dollars(potTotal)} in live pots · updated from make.fun&rsquo;s public API</p>
      </div>
      <form class="toolbar" id="board-tools" action="#/" method="get">
        <label class="visually-hidden" for="q">Search bounties</label>
        <input id="q" type="search" placeholder="Search title or slug…" value="${esc(state.text)}">
        <label class="visually-hidden" for="sort">Sort by</label>
        <select id="sort">${sortsHtml}</select>
      </form>
      <div class="chips" role="group" aria-label="Filter">${chips}</div>
      <div class="grid">${slice.map(bountyCard).join('') || '<p class="notice">No bounties match that.</p>'}</div>
      <nav class="pager" aria-label="Pages">
        ${page > 1 ? `<a href="${boardLink(state, { page: page - 1 })}">← Newer</a>` : '<span>← Newer</span>'}
        <span>Page ${page} of ${pages}</span>
        ${page < pages ? `<a href="${boardLink(state, { page: page + 1 })}">Older →</a>` : '<span>Older →</span>'}
      </nav>
    </section>`,
  );

  const qInput = document.getElementById('q');
  const sortSel = document.getElementById('sort');
  document
    .getElementById('board-tools')
    .addEventListener('submit', (ev) => ev.preventDefault());
  let timer = 0;
  qInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      location.hash = boardLink(
        { ...state, text: qInput.value.trim().toLowerCase(), page: 1 },
        {},
      );
    }, 350);
  });
  sortSel.addEventListener('change', () => {
    location.hash = boardLink(state, { sort: sortSel.value, page: 1 });
  });
}

function rewardsTable(b) {
  const rows = (b.rewardsNow || []).map(
    (r) =>
      `<tr><td>#${r.place}</td><td>${dollars(r.baseUsd)}</td>` +
      `<td>${dollars(r.feeShareUsd)}</td><td><strong>${dollars(r.amountUsd)}</strong></td></tr>`,
  );
  if (!rows.length) return '<p>No rewards table published yet.</p>';
  return (
    `<table class="rtable"><thead><tr><th>Place</th><th>Base</th>` +
    `<th>Fee share</th><th>Now</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
  );
}

export async function renderBounty(slug) {
  window.__shotReady = false;
  let b;
  try {
    b = await bounty(slug);
  } catch (err) {
    failed(err);
    return;
  }
  const open = stillOpen(b);
  const recent = (b.submissions || []).slice(0, 8);
  paint(
    `<article>
      <p class="crumbs"><a href="#/">Board</a> / ${esc(b.category || 'Bounty')}</p>
      <div class="pagehead">
        <h1>${esc(b.title)}</h1>
        <p>${esc(b.summary || '')}</p>
      </div>
      <dl class="kv">
        <div><dt>Live pot</dt><dd><strong>${dollars(b.potUsd ?? b.rewardAmount)}</strong></dd></div>
        <div><dt>Entry fee</dt><dd>${b.entryFeeUsd == null ? 'Free' : dollars(b.entryFeeUsd)}</dd></div>
        <div><dt>Deadline</dt><dd>${dayMonth(b.deadline)} · ${esc(timeLeft(b.deadline))}</dd></div>
        <div><dt>Status</dt><dd>${open ? '<span class="open">Open — taking entries</span>' : '<span class="shut">Closed</span>'}</dd></div>
        <div><dt>Entries</dt><dd>${whole(b.submissionCount)}</dd></div>
        <div><dt>Published</dt><dd>${dayMonth(b.publishedAt)}</dd></div>
      </dl>
      <p class="actions">
        <a class="btn" href="#/bounty/${esc(b.slug)}/leaderboard">Leaderboard →</a>
        <a class="btn ghost" href="https://make.fun/bounty/${esc(b.slug)}">Open on make.fun ↗</a>
      </p>
      <h2>Rewards</h2>
      ${rewardsTable(b)}
      <h2>About this bounty</h2>
      <div class="prose">${prose(b.description)}</div>
      ${recent.length ? `<h2>Latest entries</h2><ul class="entries">${recent.map((s) => `<li><a href="#/u/${esc(s.hunter)}">${esc(s.hunter)}</a> — ${esc(s.title || 'Untitled')} <span class="muted">${esc(ago(s.createdAt))} · ${esc(s.status || '')}</span></li>`).join('')}</ul>` : ''}
    </article>`,
  );
}

function avatarUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : `https://make.fun${src}`;
}

export async function renderStandings(slug) {
  window.__shotReady = false;
  let data;
  try {
    data = await standings(slug, 25);
  } catch (err) {
    failed(err);
    return;
  }
  // The API answers the whole table; keep the page light and paged: top 25.
  const shown = (data.entries || []).slice(0, 25);
  const rows = shown.map((e) => {
    const cost = e.cost ? dollars(Number(e.cost.micro_usd) / 1_000_000) : '—';
    const img = e.image
      ? `<img class="ava" crossorigin="anonymous" src="${esc(avatarUrl(e.image))}" alt="" width="28" height="28" loading="lazy">`
      : '';
    return (
      `<tr><td>${whole(e.rank)}</td>` +
      `<td>${img}<a href="#/u/${esc(e.handle)}">${esc(e.handle)}</a></td>` +
      `<td>${esc(e.title || '')}</td>` +
      `<td>${winRate(e.values && e.values.judge)}</td>` +
      `<td>${winRate(e.values && e.values.judge_low)} – ${winRate(e.values && e.values.judge_high)}</td>` +
      `<td>${cost}</td></tr>`
    );
  });
  paint(
    `<section>
      <p class="crumbs"><a href="#/">Board</a> / <a href="#/bounty/${esc(slug)}">${esc(data.competition ? data.competition.title : slug)}</a> / Leaderboard</p>
      <div class="pagehead">
        <h1>Leaderboard</h1>
        <p>${esc(data.competition ? data.competition.title : slug)} · ${esc(data.phase ? data.phase.title : '')} phase · win rate with its 90% interval</p>
      </div>
      ${rows.length
        ? `<table class="rtable wide"><thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Win rate</th><th>90% interval</th><th>Build cost</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
        : '<p class="notice">No ranked entries yet — the heat has not run.</p>'}
      <p class="muted">Showing the top ${rows.length} of ${whole((data.entries || []).length)} ranked entries. Rates come from the judge heat; ties break on dossier size.</p>
    </section>`,
  );
}

export async function renderAccount(handle) {
  window.__shotReady = false;
  let p;
  try {
    p = await account(handle);
  } catch (err) {
    failed(err);
    return;
  }
  const rec = p.record || {};
  const avatar = p.image
    ? `<img class="ava big" crossorigin="anonymous" src="${esc(avatarUrl(p.image))}" alt="Avatar of ${esc(p.handle)}" width="72" height="72">`
    : '';
  const entries = (p.solutions || []).map((s) => {
    const c = s.competition || {};
    return (
      `<li><a href="#/bounty/${esc(c.slug)}">${esc(c.title || c.slug || '')}</a>` +
      `<span class="muted"> — ${esc(s.title || '')}${s.placement ? ` · #${whole(s.placement)}` : ''}${s.prize_usd ? ` · ${dollars(s.prize_usd)}` : ''} · ${esc(ago(s.entered_at))}</span></li>`
    );
  });
  paint(
    `<section>
      <p class="crumbs"><a href="#/">Board</a> / Profile</p>
      <div class="profile">
        ${avatar}
        <div>
          <h1>${esc(p.display_name || p.handle)}</h1>
          <p class="handle">@${esc(p.handle)}</p>
          ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
          ${p.wallet ? `<p><a href="${esc(p.wallet.explorer_url)}">Wallet ${esc(p.wallet.address.slice(0, 8))}… ↗</a></p>` : ''}
        </div>
      </div>
      <dl class="kv">
        <div><dt>Entered</dt><dd><strong>${whole(rec.competitions_entered)}</strong></dd></div>
        <div><dt>Placed</dt><dd><strong>${whole(rec.competitions_placed)}</strong></dd></div>
        <div><dt>Won</dt><dd><strong>${whole(rec.competitions_won)}</strong></dd></div>
        <div><dt>Best place</dt><dd><strong>${rec.best_placement ? '#' + whole(rec.best_placement) : '—'}</strong></dd></div>
        <div><dt>Prize money</dt><dd><strong>${dollars(rec.prize_usd)}</strong></dd></div>
        <div><dt>Joined</dt><dd>${dayMonth(p.joined_at)}</dd></div>
      </dl>
      <h2>Entries (${entries.length})</h2>
      ${entries.length ? `<ul class="entries">${entries.join('')}</ul>` : '<p class="notice">No entries yet.</p>'}
    </section>`,
  );
}
