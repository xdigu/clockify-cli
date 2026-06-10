const DURATION_PATTERN = /^(?:(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?|(\d+(?:\.\d+)?)|(\d+)\s*m)$/i;

export function parseDurationToMinutes(input: string): number {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Duration cannot be empty.");
  }

  const match = trimmed.match(DURATION_PATTERN);
  if (!match) {
    throw new Error(`Invalid duration format: "${input}". Use values like 8, 8h, 7h30m, or 7.5.`);
  }

  const [, hoursWithMinutes, minutesPart, decimalHours, minutesOnly] = match;

  if (minutesOnly) {
    return Number(minutesOnly);
  }

  if (decimalHours) {
    return Math.round(Number(decimalHours) * 60);
  }

  const hours = Number(hoursWithMinutes ?? 0);
  const minutes = Number(minutesPart ?? 0);
  return Math.round(hours * 60 + minutes);
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}
