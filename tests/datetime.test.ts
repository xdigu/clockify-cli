import { describe, expect, it } from "@jest/globals";
import {
  addMinutes,
  combineDateAndTime,
  formatLocalDateTime,
  minutesBetween,
  parseTimeOfDay,
  todayDateString,
  toIsoUtc,
} from "../src/utils/datetime.js";

describe("datetime utils", () => {
  it("parses time of day", () => {
    expect(parseTimeOfDay("09:30", "start")).toEqual({ hours: 9, minutes: 30 });
  });

  it("combines date and time", () => {
    const date = combineDateAndTime("2026-06-09", "09:00");
    expect(formatLocalDateTime(date)).toBe("2026-06-09 09:00");
  });

  it("adds minutes and computes ranges", () => {
    const start = combineDateAndTime("2026-06-09", "09:00");
    const end = addMinutes(start, 90);
    expect(minutesBetween(start, end)).toBe(90);
    expect(toIsoUtc(end)).toMatch(/Z$/);
  });

  it("rejects invalid time", () => {
    expect(() => parseTimeOfDay("99:00", "start")).toThrow(/Invalid start/);
  });

  it("provides today as YYYY-MM-DD", () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects invalid dates", () => {
    expect(() => combineDateAndTime("bad-date", "09:00")).toThrow(/Invalid date/);
  });
});
