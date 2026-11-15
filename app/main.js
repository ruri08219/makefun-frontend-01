// A make.fun frontend: the board of live bounties, a page for each, its
// leaderboard, and an account's public profile, on hash routes.
//
//   #/                              the board (page N: #/page/<n>)
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard (page N: .../page/<n>)
//   #/u/<handle>                    an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, errorPage, leaderboard, profile } from './views.js';

const app = document.getElementById('app');

/** Board controls, kept across re-renders so filtering never refetches. */
const boardState = { q: '', filter: 'all', sort: 'pot', page: 1 };

let boardData = null;

function wireBoardControls() {
  const form = document.getElementById('board-controls');
  if (!form) return;
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', () => {
    boardState.q = form.q.value;
    boardState.page = 1;
    renderBoard();
  });
  form.addEventListener('change', () => {
    boardState.filter = form.filter.value;
    boardState.sort = form.sort.value;
    boardState.page = 1;
    renderBoard();
  });
}

function renderBoard() {
  app.innerHTML = board(boardData, boardState);
  wireBoardControls();
}

function done(title) {
  document.title = `${title} | make.fun bounties`;
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function fail(error) {
  const status = error && error.status === 404 ? 'That bounty, leaderboard or account does not exist on make.fun.' : 'make.fun did not answer. Check the connection and try again.';
  app.innerHTML = errorPage(status);
  done('Not found');
}

async function render() {
  window.__shotReady = false;
  app.innerHTML = '<p role="status">Loading…</p>';
  const hash = location.hash || '#/';
  try {
    let m;
    if ((m = hash.match(/^#\/page\/(\d+)$/))) {
      boardState.page = Number(m[1]);
      boardData = boardData || (await getBounties());
      renderBoard();
      done('Open bounties');
    } else if ((m = hash.match(/^#\/bounty\/([^/]+)\/leaderboard(?:\/page\/(\d+))?$/))) {
      const slug = decodeURIComponent(m[1]);
      const lb = await getLeaderboard(slug);
      app.innerHTML = leaderboard(lb, slug, Number(m[2] || 1));
      done(`Leaderboard: ${lb.competition?.title || slug}`);
    } else if ((m = hash.match(/^#\/bounty\/([^/]+)$/))) {
      const b = await getBounty(decodeURIComponent(m[1]));
      app.innerHTML = bounty(b);
      done(b.title);
    } else if ((m = hash.match(/^#\/u\/([^/]+)$/))) {
      const p = await getProfile(decodeURIComponent(m[1]));
      app.innerHTML = profile(p);
      done(`@${p.handle}`);
    } else {
      boardState.page = 1;
      boardData = await getBounties();
      renderBoard();
      done('Open bounties');
    }
  } catch (error) {
    fail(error);
  }
}

window.addEventListener('hashchange', render);
render();
