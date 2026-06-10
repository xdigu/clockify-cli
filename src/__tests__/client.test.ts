import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { clockifyRequest } from "../clockify/client";

describe("clockifyRequest", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns parsed json on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "user-1" }),
    }) as typeof fetch;

    await expect(clockifyRequest("key", "/user")).resolves.toEqual({ id: "user-1" });
  });

  it("maps 401 errors to setup guidance", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    }) as typeof fetch;

    await expect(clockifyRequest("bad-key", "/user")).rejects.toMatchObject({
      name: "ClockifyApiError",
      status: 401,
      message: expect.stringContaining("clockfycli setup"),
    });
  });

  it("handles empty responses", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
    }) as typeof fetch;

    await expect(clockifyRequest("key", "/noop")).resolves.toBeUndefined();
  });

  it("maps non-json error bodies", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
      text: async () => "server error",
    }) as typeof fetch;

    await expect(clockifyRequest("key", "/user")).rejects.toMatchObject({
      status: 500,
    });
  });
});
