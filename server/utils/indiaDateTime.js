const INDIA_TIME_ZONE = 'Asia/Kolkata';
const INDIA_OFFSET_MINUTES = 330;
const TIME_API_TIMEOUT_MS = 5000;

const createTimeApiError = (message) => Object.assign(new Error(message), { status: 503 });

const getCurrentIndianTimeFromApi = async () => {
  const configuredUrl = process.env.TIME_API_URL;
  if (!configuredUrl) {
    throw createTimeApiError('TIME_API_URL is not configured on the server.');
  }

  let url;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw createTimeApiError('TIME_API_URL is not a valid URL.');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'timeapi.io' ||
    url.pathname !== '/api/Time/current/zone' ||
    url.searchParams.get('timeZone') !== INDIA_TIME_ZONE
  ) {
    throw createTimeApiError('TIME_API_URL must be the HTTPS TimeAPI.io Asia/Kolkata endpoint.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIME_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Time API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.timeZone !== INDIA_TIME_ZONE) {
      throw new Error('Time API returned an unexpected time zone');
    }

    const { year, month, day, hour, minute, seconds, milliSeconds } = data;
    const values = [year, month, day, hour, minute, seconds, milliSeconds];
    if (!values.every(Number.isInteger)) {
      throw new Error('Time API returned invalid date or time fields');
    }

    const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, seconds, milliSeconds));
    if (
      localDate.getUTCFullYear() !== year ||
      localDate.getUTCMonth() !== month - 1 ||
      localDate.getUTCDate() !== day ||
      localDate.getUTCHours() !== hour ||
      localDate.getUTCMinutes() !== minute ||
      localDate.getUTCSeconds() !== seconds ||
      localDate.getUTCMilliseconds() !== milliSeconds
    ) {
      throw new Error('Time API returned an invalid date or time');
    }

    return new Date(localDate.getTime() - INDIA_OFFSET_MINUTES * 60 * 1000);
  } catch (error) {
    throw createTimeApiError(`Could not get the current India time from TimeAPI.io: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
};

const getIndianDateParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const getSaleDateFields = (date) => {
  const parts = getIndianDateParts(date);
  return {
    saleDate: `${parts.year}-${parts.month}-${parts.day}`,
    saleTime: `${parts.hour}:${parts.minute}`,
    saleMonth: new Intl.DateTimeFormat('en-IN', {
      timeZone: INDIA_TIME_ZONE,
      month: 'long'
    }).format(date),
    saleYear: Number(parts.year)
  };
};

const getSaleTimestamp = (dateInput, now = new Date()) => {
  if (!dateInput) return now;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!dateOnlyMatch) {
    const parsedDate = new Date(dateInput);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid sale date');
    }
    return parsedDate;
  }

  const [, yearString, monthString, dayString] = dateOnlyMatch;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const selectedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    selectedDate.getUTCFullYear() !== year ||
    selectedDate.getUTCMonth() !== month - 1 ||
    selectedDate.getUTCDate() !== day
  ) {
    throw new Error('Invalid sale date');
  }

  const currentTime = getIndianDateParts(now);
  const selectedDateTimeUtc = Date.UTC(
    year,
    month - 1,
    day,
    Number(currentTime.hour),
    Number(currentTime.minute),
    Number(currentTime.second),
    now.getUTCMilliseconds()
  ) - INDIA_OFFSET_MINUTES * 60 * 1000;

  return new Date(selectedDateTimeUtc);
};

module.exports = { getCurrentIndianTimeFromApi, getSaleDateFields, getSaleTimestamp };
