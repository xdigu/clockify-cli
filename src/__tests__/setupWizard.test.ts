import { describe, expect, it, jest } from "@jest/globals";
import { ClockifyApiError } from "../clockify/client";
import { runSetupWizard } from "../prompts/setupWizard";

describe("runSetupWizard", () => {
  it("returns existing config when user declines reconfigure", async () => {
    const existing = {
      apiKey: "key",
      workspaceId: "ws-1",
      workspaceName: "Main",
    };

    const result = await runSetupWizard(false, {
      loadConfigFn: async () => existing,
      promptConfirm: jest.fn().mockResolvedValue(false),
    });

    expect(result).toEqual(existing);
  });

  it("saves a new configuration", async () => {
    const saveConfigFn = jest.fn().mockResolvedValue(undefined);
    const logs: unknown[][] = [];

    const result = await runSetupWizard(true, {
      loadConfigFn: async () => null,
      saveConfigFn,
      getCurrentUserFn: async () => ({
        id: "u1",
        email: "a@b.com",
        name: "User",
        activeWorkspace: "ws-1",
        defaultWorkspace: "ws-1",
      }),
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      promptPassword: jest.fn().mockResolvedValue(" secret-key "),
      promptSelect: jest.fn().mockResolvedValue("ws-1"),
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("09:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: (...args: unknown[]) => logs.push(args),
    });

    expect(saveConfigFn).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "secret-key",
        workspaceId: "ws-1",
        workspaceName: "Main",
      }),
    );
    expect(result.workspaceName).toBe("Main");
    expect(logs.flat().join(" ")).toContain("Saved configuration");
  });

  it("rejects invalid api keys", async () => {
    await expect(
      runSetupWizard(true, {
        loadConfigFn: async () => null,
        getCurrentUserFn: async () => {
          throw new ClockifyApiError("Unauthorized", 401);
        },
        listWorkspacesFn: async () => [],
        promptPassword: jest.fn().mockResolvedValue("bad-key"),
      }),
    ).rejects.toThrow(/Invalid API key/);
  });

  it("rejects empty workspace lists", async () => {
    await expect(
      runSetupWizard(true, {
        loadConfigFn: async () => null,
        getCurrentUserFn: async () => ({
          id: "u1",
          email: "a@b.com",
          name: "User",
          activeWorkspace: "ws-1",
          defaultWorkspace: "ws-1",
        }),
        listWorkspacesFn: async () => [],
        promptPassword: jest.fn().mockResolvedValue("key"),
      }),
    ).rejects.toThrow(/No Clockify workspaces/);
  });
  it("validates empty api keys", async () => {
    const promptPassword = jest
      .fn()
      .mockImplementation(async (config: { validate?: (value: string) => true | string }) => {
        expect(config.validate?.("   ")).toBe("API key is required.");
        return "key";
      });

    await runSetupWizard(true, {
      loadConfigFn: async () => null,
      getCurrentUserFn: async () => ({
        id: "u1",
        email: "a@b.com",
        name: "User",
        activeWorkspace: "ws-1",
        defaultWorkspace: "ws-1",
      }),
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      saveConfigFn: jest.fn(),
      promptPassword,
      promptSelect: jest.fn().mockResolvedValue("ws-1"),
      promptInput: jest.fn().mockResolvedValue("09:00"),
      log: jest.fn(),
    });
  });

  it("rethrows unexpected api errors", async () => {
    await expect(
      runSetupWizard(true, {
        loadConfigFn: async () => null,
        getCurrentUserFn: async () => {
          throw new Error("network down");
        },
        listWorkspacesFn: async () => [],
        promptPassword: jest.fn().mockResolvedValue("key"),
      }),
    ).rejects.toThrow(/network down/);
  });
  it("falls back to a generic workspace name", async () => {
    const result = await runSetupWizard(true, {
      loadConfigFn: async () => null,
      saveConfigFn: jest.fn(),
      getCurrentUserFn: async () => ({
        id: "u1",
        email: "a@b.com",
        name: "User",
        activeWorkspace: "ws-1",
        defaultWorkspace: "ws-1",
      }),
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      promptPassword: jest.fn().mockResolvedValue("key"),
      promptSelect: jest.fn().mockResolvedValue("missing-id"),
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("09:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: jest.fn(),
    });

    expect(result.workspaceName).toBe("Workspace");
  });

  it("accepts non-empty api keys in validation", async () => {
    const promptPassword = jest
      .fn()
      .mockImplementation(async (config: { validate?: (value: string) => true | string }) => {
        expect(config.validate?.(" key ")).toBe(true);
        return " key ";
      });

    await runSetupWizard(true, {
      loadConfigFn: async () => null,
      saveConfigFn: jest.fn(),
      getCurrentUserFn: async () => ({
        id: "u1",
        email: "a@b.com",
        name: "User",
        activeWorkspace: "ws-1",
        defaultWorkspace: "ws-1",
      }),
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      promptPassword,
      promptSelect: jest.fn().mockResolvedValue("ws-1"),
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("09:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: jest.fn(),
    });
  });
});
