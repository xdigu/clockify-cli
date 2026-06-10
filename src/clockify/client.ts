const BASE_URL = "https://api.clockify.me/api/v1";

export class ClockifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ClockifyApiError";
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function clockifyRequest<T>(
  apiKey: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const message =
      response.status === 401
        ? "Clockify authentication failed. Re-run `clockfycli setup` with a valid API key."
        : `Clockify API request failed (${response.status})`;

    throw new ClockifyApiError(message, response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
