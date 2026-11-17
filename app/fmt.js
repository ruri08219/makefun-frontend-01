// fmt.js — small presenters: money, countdowns, dates, safe HTML.

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function dollars(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function whole(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10_000).toFixed(2) + '%';
}

export function dayMonth(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return '—';
  if (ms <= 0) return 'closed';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60}m left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

export function stillOpen(bounty) {
  return (
    bounty &&
    bounty.status === 'open' &&
    new Date(bounty.deadline).getTime() > Date.now()
  );
}

export function ago(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// The bounty description is markdown; show it as plain readable prose:
// ## headings become <h3>, blank lines split paragraphs, everything escaped.
export function prose(markdown) {
  const blocks = String(markdown ?? '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks
    .map((block) => {
      if (block.startsWith('## ')) return `<h3>${esc(block.slice(3).trim())}</h3>`;
      if (block.startsWith('# ')) return `<h3>${esc(block.slice(2).trim())}</h3>`;
      if (block.startsWith('- ')) {
        const items = block
          .split('\n')
          .filter((line) => line.startsWith('- '))
          .map((line) => `<li>${esc(line.slice(2).trim())}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${esc(block.replace(/\n/g, ' '))}</p>`;
    })
    .join('');
}
