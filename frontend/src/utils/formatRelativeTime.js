/**
 * Format a date string as relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string} isoDateString - ISO 8601 date string
 * @returns {string} Relative time string
 */
export function formatRelativeTime(isoDateString) {
  if (!isoDateString) return '';

  const date = new Date(isoDateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  if (diffDay < 7) return rtf.format(-diffDay, 'day');
  if (diffWeek < 4) return rtf.format(-diffWeek, 'week');
  return rtf.format(-diffMonth, 'month');
}
