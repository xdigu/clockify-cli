import { describe, expect, it } from "@jest/globals";
import { buildCombinedTaskShortDescription, buildShortDescription } from "../utils/keywords";

describe("buildShortDescription", () => {
  it("preserves ticket ids and removes stop words", () => {
    const result = buildShortDescription("worked on fixing the login bug for PROJ-123 auth flow");
    expect(result).toContain("PROJ-123");
    expect(result.toLowerCase()).not.toContain("the");
  });

  it("truncates long descriptions", () => {
    const result = buildShortDescription(
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda",
      20,
    );
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("falls back to trimmed input when no keywords remain", () => {
    expect(buildShortDescription("the and or")).toBe("the and or");
  });

  it("keeps ticket ids uppercase in short descriptions", () => {
    expect(buildShortDescription("PROJ-123 release")).toBe("PROJ-123 Release");
  });

  it("preserves commas and and in combined lunch task lists", () => {
    expect(buildCombinedTaskShortDescription(["task1", "task2", "task3", "task4"])).toBe(
      "Task1, Task2, Task3 and Task4",
    );
  });
});
