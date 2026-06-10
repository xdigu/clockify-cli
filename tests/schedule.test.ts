import { describe, expect, it } from "@jest/globals";
import {
  buildEqualSchedule,
  buildLunchSchedule,
  buildSchedule,
  validateDayWindow,
} from "../src/utils/schedule.js";

describe("buildEqualSchedule", () => {
  it("splits total duration equally", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      totalMinutes: 480,
      tasks: [{ description: "Task A" }, { description: "Task B" }],
      mode: "equal",
      workStart: "09:00",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.durationMinutes).toBe(240);
    expect(entries[1]?.durationMinutes).toBe(240);
  });

  it("uses default work start when omitted", () => {
    const entries = buildEqualSchedule({
      date: "2026-06-09",
      totalMinutes: 60,
      tasks: [{ description: "Task" }],
      mode: "equal",
    });

    expect(entries[0]?.start.getHours()).toBe(9);
  });
});

describe("buildLunchSchedule", () => {
  it("assigns tasks to before and after lunch blocks", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 480,
      mode: "lunch",
      tasks: [
        { description: "Morning task", assignment: "before" },
        { description: "Afternoon task", assignment: "after" },
      ],
      dayWindow: {
        workStart: "09:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        workEnd: "18:00",
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(480);
  });

  it("uses default day window when omitted", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 120,
      mode: "lunch",
      tasks: [
        { description: "Morning", assignment: "before" },
        { description: "Afternoon", assignment: "after" },
      ],
    });

    expect(entries.length).toBeGreaterThan(0);
  });

  it("supports tasks spanning both blocks", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 120,
      mode: "lunch",
      tasks: [{ description: "Cross lunch task", assignment: "both" }],
      dayWindow: {
        workStart: "09:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        workEnd: "18:00",
      },
    });

    expect(entries).toHaveLength(2);
  });

  it("rejects when a block has no assigned tasks", () => {
    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
        mode: "lunch",
        tasks: [{ description: "Only morning", assignment: "before" }],
        dayWindow: {
          workStart: "09:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workEnd: "18:00",
        },
      }),
    ).toThrow(/Each time block must have at least one assigned task/);
  });

  it("rejects invalid lunch windows", () => {
    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
        mode: "lunch",
        tasks: [
          { description: "Morning", assignment: "before" },
          { description: "Afternoon", assignment: "after" },
        ],
        dayWindow: {
          workStart: "13:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workEnd: "18:00",
        },
      }),
    ).toThrow(/must be before/);
  });

  it("rejects durations exceeding lunch windows", () => {
    expect(() =>
      buildLunchSchedule({
        date: "2026-06-09",
        totalMinutes: 600,
        mode: "lunch",
        tasks: [
          { description: "Morning", assignment: "before" },
          { description: "Afternoon", assignment: "after" },
        ],
        dayWindow: {
          workStart: "09:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workEnd: "18:00",
        },
      }),
    ).toThrow(/exceeds available work window/);
  });
});

describe("buildSchedule", () => {
  it("routes to equal or lunch builders", () => {
    expect(
      buildSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
        mode: "equal",
        tasks: [{ description: "One task" }],
      }),
    ).toHaveLength(1);

    expect(
      buildSchedule({
        date: "2026-06-09",
        totalMinutes: 120,
        mode: "lunch",
        tasks: [
          { description: "Morning", assignment: "before" },
          { description: "Afternoon", assignment: "after" },
        ],
      }).length,
    ).toBeGreaterThan(0);

    expect(() =>
      buildSchedule({
        date: "2026-06-09",
        totalMinutes: 0,
        mode: "equal",
        tasks: [{ description: "One task" }],
      }),
    ).toThrow(/greater than zero/);

    expect(() =>
      buildSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
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

describe("splitMinutes guardrails", () => {
  it("rejects direct equal scheduling without tasks", () => {
    expect(() =>
      buildEqualSchedule({
        date: "2026-06-09",
        totalMinutes: 60,
        tasks: [],
        mode: "equal",
      }),
    ).toThrow(/At least one task is required to schedule time/);
  });
});

  it("skips zero-length slots when splitting odd minutes", () => {
    const entries = buildLunchSchedule({
      date: "2026-06-09",
      totalMinutes: 1,
      mode: "lunch",
      tasks: [
        { description: "Morning A", assignment: "before" },
        { description: "Morning B", assignment: "before" },
        { description: "Afternoon", assignment: "after" },
      ],
      dayWindow: {
        workStart: "09:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        workEnd: "18:00",
      },
    });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(1);
  });
