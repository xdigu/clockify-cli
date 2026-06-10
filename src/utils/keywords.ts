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

function titleCaseWord(word: string): string {
  if (/^[A-Z]{2,10}-\d+$/.test(word)) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
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
