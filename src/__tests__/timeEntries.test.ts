import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createTimeEntry } from "../clockify/timeEntries";

describe("createTimeEntry", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts a completed time entry", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "entry-1", description: "Test" }),
    }) as typeof fetch;

    const entry = await createTimeEntry("key", "ws-1", {
      start: "2026-06-09T09:00:00.000Z",
      end: "2026-06-09T10:00:00.000Z",
      description: "Test",
      projectId: "p1",
    });

    expect(entry.id).toBe("entry-1");
  });
});
