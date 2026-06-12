import { describe, expect, it } from "@jest/globals";
import { buildCombinedTaskShortDescription, formatTaskList } from "../utils/keywords";
import {
  buildEqualSchedule,
  buildLunchSchedule,
  buildSchedule,
  validateDayWindow,
} from "../utils/schedule";

const defaultDayWindow = {
  workStart: "09:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  workEnd: "18:00",
};

describe("buildEqualSchedule", () => {
  it("schedules tasks with per-task durations", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      tasks: [
        { description: "Task A", durationMinutes: 120 },
        { description: "Task B", durationMinutes: 60 },
      ],
      mode: "equal",
      dayWindow: defaultDayWindow,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.durationMinutes).toBe(120);
    expect(entries[1]?.durationMinutes).toBe(60);
    expect(entries[0]?.start.getHours()).toBe(9);
    expect(entries[1]?.start.getHours()).toBe(11);
  });

  it("skips lunch when scheduling sequential per-task durations", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      tasks: [
        { description: "Task A", durationMinutes: 180 },
        { description: "Task B", durationMinutes: 60 },
      ],
      mode: "equal",
      dayWindow: defaultDayWindow,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.start.getHours()).toBe(9);
    expect(entries[0]?.end.getHours()).toBe(12);
    expect(entries[1]?.start.getHours()).toBe(13);
    expect(entries[1]?.end.getHours()).toBe(14);
  });

  it("splits a 5h task across lunch then schedules a 3h follow-up task", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      tasks: [
        { description: "First task", durationMinutes: 300 },
        { description: "Last task", durationMinutes: 180 },
      ],
      mode: "equal",
      dayWindow: {
        workStart: "08:00",
        lunchStart: "12:30",
        lunchEnd: "13:30",
        workEnd: "17:00",
      },
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]?.taskDescription).toBe("First task");
    expect(entries[0]?.start.getHours()).toBe(8);
    expect(entries[0]?.start.getMinutes()).toBe(0);
    expect(entries[0]?.end.getHours()).toBe(12);
    expect(entries[0]?.end.getMinutes()).toBe(30);
    expect(entries[0]?.durationMinutes).toBe(270);
    expect(entries[1]?.taskDescription).toBe("First task");
    expect(entries[1]?.start.getHours()).toBe(13);
    expect(entries[1]?.start.getMinutes()).toBe(30);
    expect(entries[1]?.end.getHours()).toBe(14);
    expect(entries[1]?.end.getMinutes()).toBe(0);
    expect(entries[1]?.durationMinutes).toBe(30);
    expect(entries[2]?.taskDescription).toBe("Last task");
    expect(entries[2]?.start.getHours()).toBe(14);
    expect(entries[2]?.end.getHours()).toBe(17);
    expect(entries[2]?.durationMinutes).toBe(180);
  });

  it("splits a single task across lunch when its duration crosses the break", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      tasks: [{ description: "Long task", durationMinutes: 240 }],
      mode: "equal",
      dayWindow: defaultDayWindow,
    });

    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(240);
    expect(entries[0]?.end.getHours()).toBe(12);
    expect(entries[1]?.start.getHours()).toBe(13);
  });

  it("uses default work start when omitted", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      tasks: [{ description: "Task", durationMinutes: 60 }],
      mode: "equal",
    });

    expect(entries[0]?.start.getHours()).toBe(9);
  });

  it("rejects tasks that exceed available work time", () => {
    expect(() =>
      buildEqualSchedule({
        date: "2026-06-09",
        tasks: [{ description: "Too long", durationMinutes: 600 }],
        mode: "equal",
        dayWindow: defaultDayWindow,
      }),
    ).toThrow(/exceeds available work time/);

    expect(() =>
      buildEqualSchedule({
        date: "2026-06-09",
        tasks: [
          { description: "Full day", durationMinutes: 480 },
          { description: "Extra", durationMinutes: 60 },
        ],
        mode: "equal",
        dayWindow: defaultDayWindow,
      }),
    ).toThrow(/exceeds available work time/);
  });

  it("rejects tasks without durations", () => {
    expect(() =>
      buildEqualSchedule({
        date: "2026-06-09",
        tasks: [{ description: "Task A" }],
        mode: "equal",
      }),
    ).toThrow(/missing a valid duration/);
  });

  it("rejects zero or negative task durations", () => {
    expect(() =>
      buildEqualSchedule({
        date: "2026-06-09",
        tasks: [{ description: "Task A", durationMinutes: 0 }],
        mode: "equal",
      }),
    ).toThrow(/missing a valid duration/);
  });
});

describe("formatTaskList", () => {
  it("formats one, two, and many task names", () => {
    expect(formatTaskList(["task1"])).toBe("task1");
    expect(formatTaskList(["task1", "task2"])).toBe("task1 and task2");
    expect(formatTaskList(["task1", "task2", "task3"])).toBe("task1, task2 and task3");
    expect(buildCombinedTaskShortDescription(["task1", "task2", "task3", "task4"])).toBe(
      "Task1, Task2, Task3 and Task4",
    );
  });
});

describe("buildLunchSchedule", () => {
  it("splits total duration equally before and after lunch adjacent to lunch", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 360,
      mode: "lunch",
      tasks: [{ description: "Daily work" }],
      dayWindow: {
        workStart: "08:00",
        lunchStart: "12:30",
        lunchEnd: "13:30",
        workEnd: "17:00",
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(360);
    expect(entries[0]?.start.getHours()).toBe(9);
    expect(entries[0]?.start.getMinutes()).toBe(30);
    expect(entries[0]?.end.getHours()).toBe(12);
    expect(entries[0]?.end.getMinutes()).toBe(30);
    expect(entries[1]?.start.getHours()).toBe(13);
    expect(entries[1]?.start.getMinutes()).toBe(30);
    expect(entries[1]?.end.getHours()).toBe(16);
    expect(entries[1]?.end.getMinutes()).toBe(30);
  });

  it("creates one before-lunch and one after-lunch entry with all task names", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 120,
      mode: "lunch",
      tasks: [{ description: "Task A" }, { description: "Task B" }],
      dayWindow: {
        workStart: "09:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        workEnd: "18:00",
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.taskDescription).toBe("Task A and Task B");
    expect(entries[0]?.shortDescription).toBe("Task A and Task B");
    expect(entries[1]?.taskDescription).toBe("Task A and Task B");
    expect(entries[0]?.durationMinutes).toBe(60);
    expect(entries[1]?.durationMinutes).toBe(60);
    expect(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(120);
  });

  it("uses default day window when omitted", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 120,
      mode: "lunch",
      tasks: [{ description: "Task" }],
    });

    expect(entries.length).toBeGreaterThan(0);
  });

  it("rejects invalid lunch windows", () => {
    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
        mode: "lunch",
        tasks: [{ description: "Task" }],
        dayWindow: {
          workStart: "13:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workEnd: "18:00",
        },
      }),
    ).toThrow(/must be before/);
  });

  it("rejects missing total duration", () => {
    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        mode: "lunch",
        tasks: [{ description: "Task" }],
      }),
    ).toThrow(/greater than zero/);

    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        totalMinutes: 0,
        mode: "lunch",
        tasks: [{ description: "Task" }],
      }),
    ).toThrow(/greater than zero/);

    expect(() =>
      buildSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
        mode: "lunch",
        tasks: [],
      }),
    ).toThrow(/At least one task/);
  });

  it("rejects durations exceeding lunch windows", () => {
    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        totalMinutes: 600,
        mode: "lunch",
        tasks: [{ description: "Task" }],
        dayWindow: {
          workStart: "09:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workEnd: "18:00",
        },
      }),
    ).toThrow(/exceeds available window/);
  });
});

describe("buildSchedule", () => {
  it("routes to equal or lunch builders", () => {
    expect(
      buildSchedule({
        date: "2026-06-09",
        mode: "equal",
        tasks: [{ description: "One task", durationMinutes: 60 }],
        dayWindow: defaultDayWindow,
      }),
    ).toHaveLength(1);

    expect(
      buildSchedule({
        date: "2026-06-09",
        totalMinutes: 120,
        mode: "lunch",
        tasks: [{ description: "Task" }],
      }).length,
    ).toBeGreaterThan(0);

    expect(() =>
      buildSchedule({
        date: "2026-06-09",
        mode: "equal",
        tasks: [],
      }),
    ).toThrow(/At least one task/);
  });
});

describe("validateDayWindow", () => {
  it("accepts valid windows", () => {
    expect(() =>
      validateDayWindow({
        workStart: "09:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        workEnd: "18:00",
      }),
    ).not.toThrow();
  });

  it("accepts shorthand hour inputs", () => {
    expect(() =>
      validateDayWindow({
        workStart: "8",
        lunchStart: "1230",
        lunchEnd: "1330",
        workEnd: "17h",
      }),
    ).not.toThrow();
  });

  it("rejects invalid windows", () => {
    expect(() =>
      validateDayWindow({
        workStart: "09:00",
        lunchStart: "13:00",
        lunchEnd: "12:00",
        workEnd: "18:00",
      }),
    ).toThrow(/must follow/);
  });
});

describe("equal schedule guardrails", () => {
  it("rejects direct equal scheduling without tasks", () => {
    expect(() =>
      buildEqualSchedule({
        date: "2026-06-09",
        tasks: [],
        mode: "equal",
      }),
    ).toThrow(/At least one task is required to schedule time/);
  });
});

it("skips zero-length lunch blocks when total duration is odd", () => {
  const entries = buildLunchSchedule({
    date: "2026-06-09",
    totalMinutes: 1,
    mode: "lunch",
    tasks: [{ description: "Morning A" }, { description: "Morning B" }],
    dayWindow: {
      workStart: "09:00",
      lunchStart: "12:00",
      lunchEnd: "13:00",
      workEnd: "18:00",
    },
  });

  expect(entries).toHaveLength(1);
  expect(entries[0]?.taskDescription).toBe("Morning A and Morning B");
  expect(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(1);
});
