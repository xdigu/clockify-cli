import { describe, expect, it, jest } from "@jest/globals";
import { runLogTimeFlow } from "../prompts/logTimeFlow";

describe("runLogTimeFlow", () => {
  it("creates entries after confirmation", async () => {
    const logs: unknown[][] = [];
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09", useLastProject: true },
      {
        loadConfigFn: async () => ({
          apiKey: "key",
          workspaceId: "ws-1",
          workspaceName: "Main",
          workStart: "09:00",
        }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        runSetupWizardFn: async () => ({
          apiKey: "key",
          workspaceId: "ws-1",
          workspaceName: "Main",
        }),
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("8h")
          .mockResolvedValueOnce("Task one")
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("09:00"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: (...args: unknown[]) => {
          logs.push(args);
        },
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(1);
    expect(createTimeEntryFn.mock.calls[0]?.[2]).toMatchObject({
      description: expect.any(String),
      projectId: "p1",
    });
    expect(logs.flat().join(" ")).toContain("Created entry entry-1");
  });

  it("cancels when confirmation is declined", async () => {
    const createTimeEntryFn = jest.fn();

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => ({
          apiKey: "key",
          workspaceId: "ws-1",
          workspaceName: "Main",
        }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("1h")
          .mockResolvedValueOnce("Only task")
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("09:00"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).not.toHaveBeenCalled();
  });
  it("runs setup when config is missing", async () => {
    const runSetupWizardFn = jest.fn().mockResolvedValue({
      apiKey: "key",
      workspaceId: "ws-1",
      workspaceName: "Main",
    });

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => null,
        runSetupWizardFn,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn: jest.fn().mockResolvedValue({ id: "entry-1" }),
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("1h")
          .mockResolvedValueOnce("Only task")
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("09:00"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );

    expect(runSetupWizardFn).toHaveBeenCalledWith(true);
  });

  it("supports lunch split mode", async () => {
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => ({
          apiKey: "key",
          workspaceId: "ws-1",
          workspaceName: "Main",
          workStart: "09:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workEnd: "18:00",
        }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("2h")
          .mockResolvedValueOnce("Morning only")
          .mockResolvedValueOnce("Afternoon only")
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("09:00")
          .mockResolvedValueOnce("12:00")
          .mockResolvedValueOnce("13:00")
          .mockResolvedValueOnce("18:00"),
        promptSelect: jest
          .fn()
          .mockResolvedValueOnce("lunch")
          .mockResolvedValueOnce("before")
          .mockResolvedValueOnce("after")
          .mockResolvedValueOnce("p1")
          .mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(2);
  });

  it("throws when api key is missing", async () => {
    await expect(
      runLogTimeFlow(
        { date: "2026-06-09" },
        {
          loadConfigFn: async () => ({ apiKey: "", workspaceId: "ws-1", workspaceName: "Main" }),
          resolveApiKeyFn: () => null,
        },
      ),
    ).rejects.toThrow(/Missing API key/);
  });

  it("throws when project list is empty", async () => {
    await expect(
      runLogTimeFlow(
        { date: "2026-06-09" },
        {
          loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => [],
          promptInput: jest
            .fn()
            .mockResolvedValueOnce("1h")
            .mockResolvedValueOnce("Task")
            .mockResolvedValueOnce("")
            .mockResolvedValueOnce("09:00"),
          promptSelect: jest.fn().mockResolvedValueOnce("equal"),
        },
      ),
    ).rejects.toThrow(/No active projects/);
  });

  it("validates duration and task prompts", async () => {
    const promptInput = jest
      .fn()
      .mockImplementation(
        async (config: { message?: string; validate?: (value: string) => true | string }) => {
          if (config.message?.includes("How long")) {
            expect(config.validate?.("bad")).toMatch(/Invalid duration/);
            return "1h";
          }
          if (config.message?.includes("Describe a task")) {
            expect(config.validate?.("")).toBe("At least one task is required.");
            return "Task";
          }
          if (config.message?.includes("Next task")) {
            return "";
          }
          if (config.message?.includes("Work start")) {
            return "09:00";
          }
          return "";
        },
      );

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn: jest.fn(),
        promptInput,
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );
  });

  it("maps project listing auth failures", async () => {
    const { ClockifyApiError } = await import("../clockify/client");

    await expect(
      runLogTimeFlow(
        { date: "2026-06-09" },
        {
          loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => {
            throw new ClockifyApiError("Unauthorized", 401);
          },
          promptInput: jest
            .fn()
            .mockResolvedValueOnce("1h")
            .mockResolvedValueOnce("Task")
            .mockResolvedValueOnce("")
            .mockResolvedValueOnce("09:00"),
          promptSelect: jest.fn().mockResolvedValueOnce("equal"),
        },
      ),
    ).rejects.toThrow(/Authentication failed/);
  });
  it("prompts for date when not provided", async () => {
    const promptInput = jest
      .fn()
      .mockResolvedValueOnce("2026-06-09")
      .mockResolvedValueOnce("1h")
      .mockResolvedValueOnce("Task")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("09:00");

    await runLogTimeFlow(
      {},
      {
        loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn: jest.fn(),
        promptInput,
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );

    expect(promptInput.mock.calls[0]?.[0]?.message).toContain("Date to log");
  });

  it("labels projects with client names", async () => {
    const logs: unknown[][] = [];

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [
          { id: "p1", name: "Project One", clientName: "Acme", archived: false },
        ],
        createTimeEntryFn: jest.fn(),
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("1h")
          .mockResolvedValueOnce("Task")
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("09:00"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: (...args: unknown[]) => logs.push(args),
      },
    );

    expect(logs.flat().join(" ")).toContain("Project One (Acme)");
  });

  it("rethrows non-auth project listing failures", async () => {
    await expect(
      runLogTimeFlow(
        { date: "2026-06-09" },
        {
          loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => {
            throw new Error("network down");
          },
          promptInput: jest
            .fn()
            .mockResolvedValueOnce("1h")
            .mockResolvedValueOnce("Task")
            .mockResolvedValueOnce("")
            .mockResolvedValueOnce("09:00"),
          promptSelect: jest.fn().mockResolvedValueOnce("equal"),
        },
      ),
    ).rejects.toThrow(/network down/);
  });

  it("requires a project before submitting entries", async () => {
    await expect(
      runLogTimeFlow(
        { date: "2026-06-09" },
        {
          loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
          createTimeEntryFn: jest.fn(),
          promptInput: jest
            .fn()
            .mockResolvedValueOnce("1h")
            .mockResolvedValueOnce("Task")
            .mockResolvedValueOnce("")
            .mockResolvedValueOnce("09:00"),
          promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce(undefined),
          promptConfirm: jest.fn().mockResolvedValue(true),
          log: jest.fn(),
        },
      ),
    ).rejects.toThrow(/Each entry must have a project/);
  });

  it("allows blank follow-up task prompts", async () => {
    const promptInput = jest
      .fn()
      .mockImplementation(
        async (config: { message?: string; validate?: (value: string) => true | string }) => {
          if (config.message?.includes("Describe a task")) {
            return "Task";
          }
          if (config.message?.includes("Next task")) {
            expect(config.validate?.("")).toBe(true);
            return "";
          }
          if (config.message?.includes("How long")) {
            return "1h";
          }
          if (config.message?.includes("Work start")) {
            return "09:00";
          }
          return "";
        },
      );

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => ({ apiKey: "key", workspaceId: "ws-1", workspaceName: "Main" }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn: jest.fn(),
        promptInput,
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );
  });
});
