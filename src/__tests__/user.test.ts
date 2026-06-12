import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { getCurrentUser, listWorkspaces } from "../clockify/user";

describe("clockify user api", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("loads current user", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "u1", email: "a@b.com", name: "User" }),
    }) as typeof fetch;

    await expect(getCurrentUser("key")).resolves.toMatchObject({ id: "u1" });
  });

  it("lists workspaces", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: "ws-1", name: "Main" }],
    }) as typeof fetch;

    await expect(listWorkspaces("key")).resolves.toEqual([{ id: "ws-1", name: "Main" }]);
  });
});
