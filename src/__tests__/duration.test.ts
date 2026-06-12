import { describe, expect, it } from "@jest/globals";
import { formatMinutes, parseDurationToMinutes } from "../utils/duration";

describe("parseDurationToMinutes", () => {
  it("parses whole hours", () => {
    expect(parseDurationToMinutes("8h")).toBe(480);
  });

  it("parses hours and minutes", () => {
    expect(parseDurationToMinutes("7h30m")).toBe(450);
  });

  it("parses decimal hours", () => {
    expect(parseDurationToMinutes("7.5")).toBe(450);
  });

  it("parses plain numbers as hours", () => {
    expect(parseDurationToMinutes("8")).toBe(480);
  });

  it("parses minutes only", () => {
    expect(parseDurationToMinutes("45m")).toBe(45);
  });

  it("rejects invalid input", () => {
    expect(() => parseDurationToMinutes("abc")).toThrow(/Invalid duration/);
    expect(() => parseDurationToMinutes("")).toThrow(/cannot be empty/);
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(450)).toBe("7h 30m");
    expect(formatMinutes(480)).toBe("8h");
    expect(formatMinutes(30)).toBe("30m");
  });
});
