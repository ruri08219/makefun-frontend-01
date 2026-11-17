// boot.js — entrypoint: hash router. It only pulls the view code in when the
// first route needs it, so the first load is this file plus net.js and fmt.js.
// Every route flips window.__shotReady false while loading, true once painted.

import './net.js';
import './fmt.js';

window.__shotReady = false;

const stage = document.getElementById('stage');

let panesPromise = null;
function panes() {
  if (!panesPromise) panesPromise = import('./panes.js');
  return panesPromise;
}

function splitHash() {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : '/';
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  return { parts, query: queryPart || '' };
}

async function route() {
  const { parts, query } = splitHash();
  const views = await panes();
  try {
    if (parts.length === 0) {
      await views.renderBoard(query);
    } else if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
      await views.renderStandings(decodeURIComponent(parts[1]));
    } else if (parts[0] === 'bounty' && parts[1]) {
      await views.renderBounty(decodeURIComponent(parts[1]));
    } else if (parts[0] === 'u' && parts[1]) {
      await views.renderAccount(decodeURIComponent(parts[1]));
    } else {
      stage.innerHTML =
        '<section class="notice"><h1>Nothing here</h1>' +
        '<p>That address isn&rsquo;t one of this client&rsquo;s four surfaces.</p>' +
        '<p><a href="#/">Back to the board</a></p></section>';
      window.__shotReady = true;
    }
  } catch (err) {
    stage.innerHTML =
      '<section class="notice"><h1>Something broke</h1>' +
      `<p>${err && err.message ? err.message : 'Unknown error'}</p>` +
      '<p><a href="#/">Back to the board</a></p></section>';
    window.__shotReady = true;
  }
  stage.focus({ preventScroll: true });
}

document.getElementById('lookup').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const handle = document
    .getElementById('lookup-handle')
    .value.trim()
    .replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', route);
route();
