// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Performance: answers are cached in memory and revalidated with
// If-None-Match. The API's ETags are bound to the minute, so a revalidation
// inside the same minute answers 304 and costs no body; once the minute
// turns it answers 200 with a fresh tag. One fetch per view, at most —
// filtering, sorting and paging all happen on data already fetched.

const API = 'https://make.fun/api';

/** path -> { etag, data } of the last answer seen. */
const cache = new Map();

async function get(path) {
  const hit = cache.get(path);
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) return hit.data;
  if (!res.ok) {
    const error = new Error(`make.fun API ${res.status} for ${path}`);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  cache.set(path, { etag: res.headers.get('ETag'), data });
  return data;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard: { columns, entries, ... }. Entries can number in the thousands; the view pages them. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** One account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
