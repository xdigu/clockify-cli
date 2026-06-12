export const TIME_INPUT_EXAMPLES = "9, 930, 1330, 9h, or 9h30m";

const TIME_PATTERN = /^([01]?\d|2[0-4]):([0-5]\d)$/;
const HOUR_MINUTE_SUFFIX_PATTERN = /^(\d{1,2})\s*h\s*(\d{1,2})\s*m?$/i;
const HOUR_SUFFIX_PATTERN = /^(\d{1,2})\s*h$/i;
const COMPACT_DIGITS_PATTERN = /^(\d{1,4})$/;

function validateHourRange(hours: number, fieldName: string): void {
  if (!Number.isInteger(hours) || hours < 0 || hours > 24) {
    throw new Error(`Invalid ${fieldName} time: hour must be between 0 and 24.`);
  }
  if (hours === 24) {
    throw new Error(`Invalid ${fieldName} time: use 00:00–23:59 (24 is not a valid clock time).`);
  }
}

function validateMinuteRange(minutes: number, fieldName: string): void {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid ${fieldName} time: minutes must be between 0 and 59.`);
  }
}

function invalidTimeError(value: string, fieldName: string): Error {
  return new Error(
    `Invalid ${fieldName} time: "${value}". Use HH:MM or shorthand like ${TIME_INPUT_EXAMPLES}.`,
  );
}

function parseCompactDigits(value: string, fieldName: string): { hours: number; minutes: number } {
  const match = value.match(COMPACT_DIGITS_PATTERN);
  if (!match) {
    throw invalidTimeError(value, fieldName);
  }

  const digits = match[1] ?? "";
  let hours: number;
  let minutes: number;

  if (digits.length <= 2) {
    hours = Number(digits);
    minutes = 0;
  } else if (digits.length === 3) {
    hours = Number(digits[0]);
    minutes = Number(digits.slice(1));
  } else {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2));
  }

  validateHourRange(hours, fieldName);
  validateMinuteRange(minutes, fieldName);
  return { hours, minutes };
}

export function parseTimeOfDay(
  value: string,
  fieldName: string,
): { hours: number; minutes: number } {
  const trimmed = value.trim();

  const colonMatch = trimmed.match(TIME_PATTERN);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    validateHourRange(hours, fieldName);
    validateMinuteRange(minutes, fieldName);
    return { hours, minutes };
  }

  const hourMinuteSuffixMatch = trimmed.match(HOUR_MINUTE_SUFFIX_PATTERN);
  if (hourMinuteSuffixMatch) {
    const hours = Number(hourMinuteSuffixMatch[1]);
    const minutes = Number(hourMinuteSuffixMatch[2]);
    validateHourRange(hours, fieldName);
    validateMinuteRange(minutes, fieldName);
    return { hours, minutes };
  }

  const hourSuffixMatch = trimmed.match(HOUR_SUFFIX_PATTERN);
  if (hourSuffixMatch) {
    const hours = Number(hourSuffixMatch[1]);
    validateHourRange(hours, fieldName);
    return { hours, minutes: 0 };
  }

  if (COMPACT_DIGITS_PATTERN.test(trimmed)) {
    return parseCompactDigits(trimmed, fieldName);
  }

  throw invalidTimeError(value, fieldName);
}

export function formatTimeOfDay(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function subtractMinutesFromTime(time: string, minutes: number, fieldName = "time"): string {
  const { hours, minutes: timeMinutes } = parseTimeOfDay(time, fieldName);
  const totalMinutes = hours * 60 + timeMinutes - minutes;
  if (totalMinutes < 0) {
    throw new Error(`Cannot subtract ${minutes}m from ${time}.`);
  }
  const resultHours = Math.floor(totalMinutes / 60);
  const resultMinutes = totalMinutes % 60;
  return formatTimeOfDay(resultHours, resultMinutes);
}

export function addMinutesToTime(time: string, minutes: number, fieldName = "time"): string {
  const { hours, minutes: timeMinutes } = parseTimeOfDay(time, fieldName);
  const totalMinutes = hours * 60 + timeMinutes + minutes;
  const resultHours = Math.floor(totalMinutes / 60);
  const resultMinutes = totalMinutes % 60;
  if (resultHours > 23) {
    throw new Error(`Adding ${minutes}m to ${time} exceeds the day.`);
  }
  return formatTimeOfDay(resultHours, resultMinutes);
}

export function combineDateAndTime(date: string, time: string): Date {
  const { hours, minutes } = parseTimeOfDay(time, "time");
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: "${date}". Use YYYY-MM-DD format.`);
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
