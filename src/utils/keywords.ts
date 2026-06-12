const TICKET_ID_PATTERN = /\b[A-Z]{2,10}-\d+\b/g;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "worked",
  "working",
  "fixing",
  "fixed",
  "update",
  "updated",
  "updating",
  "review",
  "reviewing",
  "implement",
  "implementing",
  "done",
  "did",
  "was",
  "were",
]);

export function titleCaseWord(word: string): string {
  if (/^[A-Z]{2,10}-\d+$/.test(word)) {
    return word;
  }
  return word
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatTaskList(descriptions: string[]): string {
  const names = descriptions.map((description) => description.trim()).filter(Boolean);
  if (names.length === 0) {
    throw new Error("At least one task is required.");
  }
  if (names.length === 1) {
    return names[0]!;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}

export function buildCombinedTaskShortDescription(descriptions: string[]): string {
  return formatTaskList(descriptions.map(titleCaseWord));
}

export function buildShortDescription(input: string, maxLength = 50): string {
  const ticketIds = [...new Set(input.match(TICKET_ID_PATTERN) ?? [])];
  const cleaned = input
    .replace(TICKET_ID_PATTERN, " ")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token.toLowerCase()));

  const tokens: string[] = [];
  for (const ticketId of ticketIds) {
    tokens.push(ticketId);
  }

  for (const token of cleaned) {
    if (tokens.length >= ticketIds.length + 6) {
      break;
    }
    tokens.push(titleCaseWord(token));
  }

  if (tokens.length === 0) {
    return input.trim().slice(0, maxLength);
  }

  let result = tokens.join(" ");
  if (result.length > maxLength) {
    result = `${result.slice(0, maxLength - 3).trim()}...`;
  }

  return result;
}
