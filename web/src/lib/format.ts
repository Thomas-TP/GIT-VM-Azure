import i18n from '../i18n';

// Two input shapes arrive here:
//   - SQLite datetime('now') -> "YYYY-MM-DD HH:MM:SS" (UTC, no T, no timezone)
//   - API ISO dates (start/end) -> "2026-06-25T18:37:00.000Z" (already has a timezone)
// We must only force-UTC the first kind; the second already carries 'Z'/offset.
// Both are then rendered in the viewer's local timezone (e.g. Europe/Zurich).
export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
}

// Compact uptime from an ISO launch time (e.g. "2d 4h", "5h 12m", "8m").
export function fmtUptime(iso?: string | null): string {
  if (!iso) return '—';
  const start = new Date(iso).getTime();
  if (isNaN(start)) return '—';
  let s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
