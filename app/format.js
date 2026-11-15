// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

/** A deadline as a date in UTC. */
export function date(iso) {
  if (!iso) return '—';
  return `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/**
 * Whether a bounty still takes entries. A bounty past its deadline may
 * still read status open until its results are published, so the deadline
 * decides, not the status alone.
 */
export function isOpen(b) {
  return b && b.deadline ? new Date(b.deadline).getTime() > Date.now() : b.status === 'open';
}

/** '1 entry' / '23 entries'. */
export function entries(n) {
  return `${Number(n) || 0} ${Number(n) === 1 ? 'entry' : 'entries'}`;
}

/** A leaderboard score as the API displays it ('887222' micro-units -> '88.72%'). */
export function score(value, precision) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  // Judge win rates arrive in micro-units; other scores arrive as-is.
  const shown = precision === 0 && n > 10000 ? n / 10000 : n;
  return precision === 0 ? `${shown.toFixed(2)}%` : String(shown);
}
