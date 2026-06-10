import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { listProjects } from "../clockify/projects";

describe("listProjects", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("filters archived projects", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { id: "1", name: "Active", archived: false },
        { id: "2", name: "Archived", archived: true },
      ],
    }) as typeof fetch;

    const projects = await listProjects("key", "ws-1");
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe("1");
  });

  it("paginates when the first page is full", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: String(index),
      name: `Project ${index}`,
      archived: false,
    }));

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => firstPage,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: "500", name: "Project 500", archived: false }],
      }) as typeof fetch;

    const projects = await listProjects("key", "ws-1");
    expect(projects).toHaveLength(501);
  });
});
