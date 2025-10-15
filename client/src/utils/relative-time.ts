const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto'
});

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

interface Threshold {
  limit: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}

const thresholds: Threshold[] = [
  { limit: MINUTE, divisor: SECOND, unit: 'second' },
  { limit: HOUR, divisor: MINUTE, unit: 'minute' },
  { limit: DAY, divisor: HOUR, unit: 'hour' },
  { limit: WEEK, divisor: DAY, unit: 'day' },
  { limit: MONTH, divisor: WEEK, unit: 'week' },
  { limit: YEAR, divisor: MONTH, unit: 'month' },
  { limit: Infinity, divisor: YEAR, unit: 'year' }
];

const parseDateInput = (input: Date | string | number): Date | null => {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function formatRelativeTime(input: Date | string | number): string {
  const targetDate = parseDateInput(input);

  if (!targetDate) {
    return '';
  }

  const diffInSeconds = Math.round((targetDate.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffInSeconds);

  for (const { limit, divisor, unit } of thresholds) {
    if (absoluteSeconds < limit) {
      const value = Math.round(diffInSeconds / divisor);
      return relativeTimeFormatter.format(value, unit);
    }
  }

  return '';
}
