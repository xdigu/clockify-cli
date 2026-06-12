import { describe, expect, it } from "@jest/globals";
import {
  addMinutes,
  addMinutesToTime,
  combineDateAndTime,
  formatLocalDateTime,
  minutesBetween,
  parseTimeOfDay,
  subtractMinutesFromTime,
  TIME_INPUT_EXAMPLES,
  todayDateString,
  toIsoUtc,
} from "../utils/datetime";

describe("datetime utils", () => {
  it("parses HH:MM time of day", () => {
    expect(parseTimeOfDay("09:30", "start")).toEqual({ hours: 9, minutes: 30 });
  });

  it("parses compact and shorthand time formats", () => {
    expect(parseTimeOfDay("9", "start")).toEqual({ hours: 9, minutes: 0 });
    expect(parseTimeOfDay("930", "start")).toEqual({ hours: 9, minutes: 30 });
    expect(parseTimeOfDay("15", "start")).toEqual({ hours: 15, minutes: 0 });
    expect(parseTimeOfDay("1500", "start")).toEqual({ hours: 15, minutes: 0 });
    expect(parseTimeOfDay("1330", "start")).toEqual({ hours: 13, minutes: 30 });
    expect(parseTimeOfDay("9h", "start")).toEqual({ hours: 9, minutes: 0 });
    expect(parseTimeOfDay("9h30m", "start")).toEqual({ hours: 9, minutes: 30 });
    expect(parseTimeOfDay("9H30", "start")).toEqual({ hours: 9, minutes: 30 });
  });

  it("documents supported shorthand examples", () => {
    expect(TIME_INPUT_EXAMPLES).toContain("930");
    expect(TIME_INPUT_EXAMPLES).toContain("9h30m");
  });

  it("combines date and time", () => {
    const date = combineDateAndTime("2026-06-09", "09:00");
    expect(formatLocalDateTime(date)).toBe("2026-06-09 09:00");
  });

  it("combines date with shorthand hour input", () => {
    expect(formatLocalDateTime(combineDateAndTime("2026-06-09", "930"))).toBe("2026-06-09 09:30");
    expect(formatLocalDateTime(combineDateAndTime("2026-06-09", "9h30m"))).toBe("2026-06-09 09:30");
  });

  it("adds minutes and computes ranges", () => {
    const start = combineDateAndTime("2026-06-09", "09:00");
    const end = addMinutes(start, 90);
    expect(minutesBetween(start, end)).toBe(90);
    expect(toIsoUtc(end)).toMatch(/Z$/);
  });

  it("subtracts minutes from a time", () => {
    expect(subtractMinutesFromTime("12:30", 180)).toBe("09:30");
    expect(subtractMinutesFromTime("1330", 180)).toBe("10:30");
  });

  it("adds minutes to a time", () => {
    expect(addMinutesToTime("13:30", 180)).toBe("16:30");
    expect(addMinutesToTime("930", 60)).toBe("10:30");
  });

  it("rejects invalid time", () => {
    expect(() => parseTimeOfDay("99:00", "start")).toThrow(/Invalid start/);
    expect(() => parseTimeOfDay("25", "start")).toThrow(/between 0 and 24/);
    expect(() => parseTimeOfDay("24:00", "start")).toThrow(/24 is not a valid clock time/);
    expect(() => parseTimeOfDay("960", "start")).toThrow(/minutes must be between 0 and 59/);
    expect(() => parseTimeOfDay("1560", "start")).toThrow(/minutes must be between 0 and 59/);
    expect(() => parseTimeOfDay("bad", "start")).toThrow(new RegExp(TIME_INPUT_EXAMPLES));
    expect(() => subtractMinutesFromTime("00:30", 60)).toThrow(/Cannot subtract/);
    expect(() => addMinutesToTime("23:30", 60)).toThrow(/exceeds the day/);
  });

  it("provides today as YYYY-MM-DD", () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects invalid dates", () => {
    expect(() => combineDateAndTime("bad-date", "09:00")).toThrow(/Invalid date/);
  });
});
