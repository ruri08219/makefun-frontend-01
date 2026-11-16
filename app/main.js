// Hash router for the four surfaces. Each route is a link and a URL:
//
//   #/                                  the bounty board
//   #/page/<n>                           board, page n
//   #/bounty/<slug>                      one bounty
//   #/bounty/<slug>/leaderboard          its leaderboard
//   #/bounty/<slug>/leaderboard/page/<n> leaderboard, page n
//   #/u/<handle>                         an account's profile
//
// window.__shotReady is false while a route loads and true once its data
// is on screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const view = document.getElementById('view');

/** Board controls, kept across re-renders so filtering never refetches. */
const boardState = { q: '', filter: 'all', sort: 'deadline', page: 1 };

function show(html, title) {
  view.innerHTML = html;
  document.title = title;
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function showError(error, title) {
  const status = error.status === 404 ? 'Not found' : 'Something went wrong';
  view.innerHTML = `<h1>${status}</h1>
    <p class="error">${status === 'Not found' ? 'That bounty or profile does not exist.' : 'make.fun did not answer. Try again in a moment.'}</p>
    <p><a href="#/">← Back to the board</a></p>`;
  document.title = `${status} | make.fun bounties`;
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

/** Wire the board's search/filter/sort controls to re-render in place. */
function wireBoard(items) {
  const form = document.getElementById('board-controls');
  if (!form) return;
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', () => {
    boardState.q = form.q.value;
    boardState.filter = form.filter.value;
    boardState.sort = form.sort.value;
    boardState.page = 1;
    view.innerHTML = board(items, boardState);
    wireBoard(items);
  });
}

async function render() {
  window.__shotReady = false;
  view.innerHTML = '<p class="loading">Loading…</p>';
  const hash = location.hash || '#/';
  try {
    let match = hash.match(/^#\/bounty\/([^/]+)\/leaderboard\/page\/(\d+)$/);
    if (match) {
      const lb = await getLeaderboard(decodeURIComponent(match[1]));
      show(leaderboard(lb, Number(match[2])), `${lb.competition?.title ?? 'Leaderboard'} | make.fun bounties`);
      return;
    }
    match = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
    if (match) {
      const lb = await getLeaderboard(decodeURIComponent(match[1]));
      show(leaderboard(lb, 1), `${lb.competition?.title ?? 'Leaderboard'} | make.fun bounties`);
      return;
    }
    match = hash.match(/^#\/bounty\/([^/]+)$/);
    if (match) {
      const b = await getBounty(decodeURIComponent(match[1]));
      show(bounty(b), `${b.title} | make.fun bounties`);
      return;
    }
    match = hash.match(/^#\/u\/([^/]+)$/);
    if (match) {
      const p = await getProfile(decodeURIComponent(match[1]));
      show(profile(p), `${p.display_name ?? p.handle} | make.fun bounties`);
      return;
    }
    match = hash.match(/^#\/page\/(\d+)$/);
    const page = match ? Number(match[1]) : 1;
    boardState.page = page;
    const data = await getBounties();
    view.innerHTML = board(data.items ?? [], boardState);
    wireBoard(data.items ?? []);
    document.title = 'make.fun bounties';
    window.scrollTo(0, 0);
    window.__shotReady = true;
  } catch (error) {
    showError(error);
  }
}

window.addEventListener('hashchange', render);
render();
