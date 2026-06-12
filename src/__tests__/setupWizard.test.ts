import { describe, expect, it, jest } from "@jest/globals";
import { ClockifyApiError } from "../clockify/client";
import { runSetupWizard } from "../prompts/setupWizard";

const existingConfig = {
  apiKey: "existing-key",
  workspaceId: "ws-1",
  workspaceName: "Main",
  workStart: "08:00",
  lunchStart: "12:30",
  lunchEnd: "13:30",
  workEnd: "17:00",
};

describe("runSetupWizard", () => {
  it("returns existing config when user declines reconfigure", async () => {
    const result = await runSetupWizard(false, {
      loadConfigFn: async () => existingConfig,
      promptConfirm: jest.fn().mockResolvedValue(false),
    });

    expect(result).toEqual(existingConfig);
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

  it("offers update choices when user confirms reconfigure", async () => {
    const saveConfigFn = jest.fn().mockResolvedValue(undefined);
    const promptSelect = jest.fn().mockResolvedValueOnce("schedule").mockResolvedValueOnce("ws-1");

    await runSetupWizard(false, {
      loadConfigFn: async () => existingConfig,
      saveConfigFn,
      promptConfirm: jest.fn().mockResolvedValue(true),
      promptSelect,
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("10:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: jest.fn(),
    });

    expect(promptSelect.mock.calls[0]?.[0]?.message).toContain("What would you like to update");
    expect(saveConfigFn).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "existing-key",
        workStart: "10:00",
      }),
    );
  });

  it("updates schedule only while keeping existing credentials", async () => {
    const saveConfigFn = jest.fn().mockResolvedValue(undefined);
    const promptPassword = jest.fn();
    const getCurrentUserFn = jest.fn();

    const result = await runSetupWizard(true, {
      loadConfigFn: async () => existingConfig,
      saveConfigFn,
      getCurrentUserFn,
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      promptPassword,
      promptSelect: jest.fn().mockResolvedValueOnce("schedule"),
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("09:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: jest.fn(),
    });

    expect(promptPassword).not.toHaveBeenCalled();
    expect(getCurrentUserFn).not.toHaveBeenCalled();
    expect(saveConfigFn).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "existing-key",
        workspaceId: "ws-1",
        workspaceName: "Main",
        workStart: "09:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        workEnd: "18:00",
      }),
    );
    expect(result.apiKey).toBe("existing-key");
  });

  it("updates credentials when selected during reconfigure", async () => {
    const saveConfigFn = jest.fn().mockResolvedValue(undefined);

    await runSetupWizard(true, {
      loadConfigFn: async () => existingConfig,
      saveConfigFn,
      getCurrentUserFn: async () => ({
        id: "u1",
        email: "a@b.com",
        name: "User",
        activeWorkspace: "ws-1",
        defaultWorkspace: "ws-1",
      }),
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      promptPassword: jest.fn().mockResolvedValue("new-key"),
      promptSelect: jest.fn().mockResolvedValueOnce("credentials").mockResolvedValueOnce("ws-1"),
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("09:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: jest.fn(),
    });

    expect(saveConfigFn).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "new-key",
        workspaceId: "ws-1",
      }),
    );
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

  it("defaults workspace selection to the existing workspace", async () => {
    const promptSelect = jest
      .fn()
      .mockImplementation(
        async (config: { message?: string; default?: string; choices?: { value: string }[] }) => {
          if (config.message?.includes("What would you like")) {
            return "credentials";
          }
          expect(config.default).toBe("ws-1");
          return "ws-1";
        },
      );

    await runSetupWizard(true, {
      loadConfigFn: async () => existingConfig,
      saveConfigFn: jest.fn(),
      getCurrentUserFn: async () => ({
        id: "u1",
        email: "a@b.com",
        name: "User",
        activeWorkspace: "ws-1",
        defaultWorkspace: "ws-1",
      }),
      listWorkspacesFn: async () => [{ id: "ws-1", name: "Main" }],
      promptPassword: jest.fn().mockResolvedValue("new-key"),
      promptSelect,
      promptInput: jest
        .fn()
        .mockResolvedValueOnce("09:00")
        .mockResolvedValueOnce("12:00")
        .mockResolvedValueOnce("13:00")
        .mockResolvedValueOnce("18:00"),
      log: jest.fn(),
    });
  });

  it("validates time inputs during setup", async () => {
    const promptInput = jest
      .fn()
      .mockImplementation(
        async (config: { message?: string; validate?: (value: string) => true | string }) => {
          if (config.message?.includes("work start")) {
            expect(config.validate?.("bad")).toMatch(/Invalid work start/);
            expect(config.message).toContain("930");
            return "9";
          }
          if (config.message?.includes("lunch start")) {
            expect(config.validate?.("1230")).toBe(true);
            return "1230";
          }
          if (config.message?.includes("lunch end")) {
            expect(config.validate?.("1330")).toBe(true);
            return "1330";
          }
          if (config.message?.includes("work end")) {
            expect(config.validate?.("18h")).toBe(true);
            return "18h";
          }
          return "";
        },
      );

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
      promptPassword: jest.fn().mockResolvedValue("key"),
      promptSelect: jest.fn().mockResolvedValue("ws-1"),
      promptInput,
      log: jest.fn(),
    });
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
