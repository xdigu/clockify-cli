import { describe, expect, it, jest } from "@jest/globals";
import { runLogTimeFlow } from "../prompts/logTimeFlow";

const baseConfig = {
  apiKey: "key",
  workspaceId: "ws-1",
  workspaceName: "Main",
  workStart: "09:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  workEnd: "18:00",
};

describe("runLogTimeFlow", () => {
  it("creates entries after confirmation", async () => {
    const logs: unknown[][] = [];
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09", useLastProject: true },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        runSetupWizardFn: async () => baseConfig,
        promptInput: jest.fn().mockResolvedValueOnce("Task one").mockResolvedValueOnce("2h"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: (...args: unknown[]) => {
          logs.push(args);
        },
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(1);
    expect(logs.flat().join(" ")).toContain("Created entry entry-1");
    expect(logs.flat().join(" ")).toContain("clockify-cli setup");
  });

  it("cancels when confirmation is declined", async () => {
    const createTimeEntryFn = jest.fn();

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest.fn().mockResolvedValueOnce("Only task").mockResolvedValueOnce("1h"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).not.toHaveBeenCalled();
  });

  it("runs setup when config is missing", async () => {
    const runSetupWizardFn = jest.fn().mockResolvedValue(baseConfig);

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => null,
        runSetupWizardFn,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn: jest.fn().mockResolvedValue({ id: "entry-1" }),
        promptInput: jest.fn().mockResolvedValueOnce("Only task").mockResolvedValueOnce("1h"),
        promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );

    expect(runSetupWizardFn).toHaveBeenCalledWith(true);
  });

  it("combines all task names into before and after lunch entries", async () => {
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("Morning only; Afternoon only")
          .mockResolvedValueOnce("2h"),
        promptSelect: jest.fn().mockResolvedValueOnce("lunch").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(2);
    expect(createTimeEntryFn.mock.calls[0]?.[2]?.description).toContain("Morning");
    expect(createTimeEntryFn.mock.calls[0]?.[2]?.description).toContain("Afternoon");
    expect(createTimeEntryFn.mock.calls[1]?.[2]?.description).toBe(
      createTimeEntryFn.mock.calls[0]?.[2]?.description,
    );
  });

  it("supports lunch split mode using setup schedule defaults", async () => {
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });
    const promptInput = jest
      .fn()
      .mockResolvedValueOnce("Morning only; Afternoon only")
      .mockResolvedValueOnce("2h");

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput,
        promptSelect: jest.fn().mockResolvedValueOnce("lunch").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(2);
    expect(promptInput.mock.calls.some((call) => call[0]?.message?.includes("Work start"))).toBe(
      false,
    );
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
          loadConfigFn: async () => baseConfig,
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => [],
          promptInput: jest.fn().mockResolvedValueOnce("Task").mockResolvedValueOnce("1h"),
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
          if (config.message?.includes("Describe tasks")) {
            expect(config.validate?.("")).toBe("At least one task is required.");
            expect(config.validate?.("   ")).toBe("At least one task is required.");
            expect(config.validate?.("Task A; Task B")).toBe(true);
            return "Task";
          }
          if (config.message?.includes("How long did you work on")) {
            expect(config.validate?.("bad")).toMatch(/Invalid duration/);
            return "1h";
          }
          return "";
        },
      );

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
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
          loadConfigFn: async () => baseConfig,
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => {
            throw new ClockifyApiError("Unauthorized", 401);
          },
          promptInput: jest.fn().mockResolvedValueOnce("Task").mockResolvedValueOnce("1h"),
          promptSelect: jest.fn().mockResolvedValueOnce("equal"),
        },
      ),
    ).rejects.toThrow(/Authentication failed/);
  });

  it("prompts for date when not provided", async () => {
    const promptInput = jest
      .fn()
      .mockResolvedValueOnce("2026-06-09")
      .mockResolvedValueOnce("Task")
      .mockResolvedValueOnce("1h");

    await runLogTimeFlow(
      {},
      {
        loadConfigFn: async () => baseConfig,
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
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [
          { id: "p1", name: "Project One", clientName: "Acme", archived: false },
        ],
        createTimeEntryFn: jest.fn(),
        promptInput: jest.fn().mockResolvedValueOnce("Task").mockResolvedValueOnce("1h"),
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
          loadConfigFn: async () => baseConfig,
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => {
            throw new Error("network down");
          },
          promptInput: jest.fn().mockResolvedValueOnce("Task").mockResolvedValueOnce("1h"),
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
          loadConfigFn: async () => baseConfig,
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
          createTimeEntryFn: jest.fn(),
          promptInput: jest.fn().mockResolvedValueOnce("Task").mockResolvedValueOnce("1h"),
          promptSelect: jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce(undefined),
          promptConfirm: jest.fn().mockResolvedValue(true),
          log: jest.fn(),
        },
      ),
    ).rejects.toThrow(/Each entry must have a project/);
  });

  it("validates lunch mode total duration", async () => {
    const promptInput = jest
      .fn()
      .mockImplementation(
        async (config: { message?: string; validate?: (value: string) => true | string }) => {
          if (config.message?.includes("Describe tasks")) {
            return "Task";
          }
          if (config.message?.includes("How long did you work in total")) {
            expect(config.validate?.("bad")).toMatch(/Invalid duration/);
            expect(config.validate?.("0h")).toBe("Duration must be greater than zero.");
            return "2h";
          }
          return "";
        },
      );

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn: jest.fn(),
        promptInput,
        promptSelect: jest.fn().mockResolvedValueOnce("lunch").mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(false),
        log: jest.fn(),
      },
    );
  });

  it("rejects invalid lunch schedule from setup config", async () => {
    await expect(
      runLogTimeFlow(
        { date: "2026-06-09" },
        {
          loadConfigFn: async () => ({
            ...baseConfig,
            lunchStart: "13:00",
            lunchEnd: "12:00",
          }),
          resolveApiKeyFn: () => "key",
          listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
          promptInput: jest.fn().mockResolvedValueOnce("Task").mockResolvedValueOnce("2h"),
          promptSelect: jest.fn().mockResolvedValueOnce("lunch"),
          log: jest.fn(),
        },
      ),
    ).rejects.toThrow(/must follow/);
  });

  it("rejects zero duration for individual tasks", async () => {
    const promptInput = jest
      .fn()
      .mockImplementation(
        async (config: { message?: string; validate?: (value: string) => true | string }) => {
          if (config.message?.includes("Describe tasks")) {
            return "Task";
          }
          if (config.message?.includes("How long did you work on")) {
            expect(config.validate?.("0")).toBe("Duration must be greater than zero.");
            return "1h";
          }
          return "";
        },
      );

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
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

  it("schedules per-task durations across lunch using setup defaults", async () => {
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("Morning work; Afternoon work")
          .mockResolvedValueOnce("3h")
          .mockResolvedValueOnce("1h"),
        promptSelect: jest
          .fn()
          .mockResolvedValueOnce("equal")
          .mockResolvedValueOnce("p1")
          .mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(2);
    const firstStart = new Date(createTimeEntryFn.mock.calls[0]?.[2]?.start as string);
    const secondStart = new Date(createTimeEntryFn.mock.calls[1]?.[2]?.start as string);
    expect(firstStart.getHours()).toBe(9);
    expect(secondStart.getHours()).toBe(13);
  });

  it("asks for project once when a task is split across lunch", async () => {
    const promptSelect = jest.fn().mockResolvedValueOnce("equal").mockResolvedValueOnce("p1");

    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => ({
          ...baseConfig,
          workStart: "08:00",
          lunchStart: "12:30",
          lunchEnd: "13:30",
          workEnd: "17:00",
        }),
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest.fn().mockResolvedValueOnce("Long task").mockResolvedValueOnce("5h"),
        promptSelect,
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: jest.fn(),
      },
    );

    const projectPrompts = promptSelect.mock.calls.filter((call) =>
      call[0]?.message?.includes("Project for"),
    );
    expect(projectPrompts).toHaveLength(1);
    expect(createTimeEntryFn).toHaveBeenCalledTimes(2);
    expect(createTimeEntryFn.mock.calls[0]?.[2]?.projectId).toBe("p1");
    expect(createTimeEntryFn.mock.calls[1]?.[2]?.projectId).toBe("p1");
  });

  it("parses semicolon-separated tasks", async () => {
    const createTimeEntryFn = jest.fn().mockResolvedValue({ id: "entry-1" });

    await runLogTimeFlow(
      { date: "2026-06-09" },
      {
        loadConfigFn: async () => baseConfig,
        resolveApiKeyFn: () => "key",
        listProjectsFn: async () => [{ id: "p1", name: "Project One", archived: false }],
        createTimeEntryFn,
        promptInput: jest
          .fn()
          .mockResolvedValueOnce("Task A; Task B")
          .mockResolvedValueOnce("1h")
          .mockResolvedValueOnce("2h"),
        promptSelect: jest
          .fn()
          .mockResolvedValueOnce("equal")
          .mockResolvedValueOnce("p1")
          .mockResolvedValueOnce("p1"),
        promptConfirm: jest.fn().mockResolvedValue(true),
        log: jest.fn(),
      },
    );

    expect(createTimeEntryFn).toHaveBeenCalledTimes(2);
  });
});
