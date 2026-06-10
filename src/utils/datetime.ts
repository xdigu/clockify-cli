const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseTimeOfDay(
  value: string,
  fieldName: string,
): { hours: number; minutes: number } {
  const match = value.trim().match(TIME_PATTERN);
  if (!match) {
    throw new Error(`Invalid ${fieldName} time: "${value}". Use HH:MM format.`);
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
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
