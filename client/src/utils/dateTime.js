const INDIA_TIME_ZONE = 'Asia/Kolkata';

const toDate = (value) => {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatIndianDate = (value) => {
  const date = toDate(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatIndianTime = (value) => {
  const date = toDate(value);
  if (!date) return '';

  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h12'
  }).formatToParts(date);

  return parts
    .map(({ type, value: partValue }) => type === 'dayPeriod' ? partValue.toUpperCase() : partValue)
    .join('');
};

export const getIndianDateInputValue = (value = new Date()) => {
  const date = toDate(value);
  if (!date) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
};
