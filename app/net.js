// net.js — one tiny cached reader for make.fun's public API (GET only).
// Every answer is kept in memory with its ETag; a repeat within FRESH_MS costs
// no request at all, and after that the cached ETag is revalidated with
// If-None-Match, so the API answers 304 and sends no body again. That keeps
// each view at most one real request, usually zero.

const API = 'https://make.fun/api';
const FRESH_MS = 45_000;

const shelf = new Map(); // path -> { etag, payload, fetchedAt }

export async function getJson(path) {
  const held = shelf.get(path);
  const now = Date.now();
  if (held && now - held.fetchedAt < FRESH_MS) return held.payload;

  const headers = { Accept: 'application/json' };
  if (held && held.etag) headers['If-None-Match'] = held.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && held) {
    held.fetchedAt = now;
    return held.payload;
  }
  if (!res.ok) {
    const err = new Error(`make.fun ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const payload = await res.json();
  shelf.set(path, {
    etag: res.headers.get('etag'),
    payload,
    fetchedAt: now,
  });
  return payload;
}

export function boardPage(limit) {
  return getJson(`/competitions?status=open&limit=${limit}`);
}

export function bounty(slug) {
  return getJson(`/competitions/${encodeURIComponent(slug)}`);
}

export function standings(slug, limit) {
  return getJson(
    `/competitions/${encodeURIComponent(slug)}/leaderboard?limit=${limit}`,
  );
}

export function account(handle) {
  return getJson(`/profiles/${encodeURIComponent(handle)}`);
}
