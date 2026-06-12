import {
  addMinutes,
  combineDateAndTime,
  minutesBetween,
  parseTimeOfDay,
  subtractMinutesFromTime,
} from "@utils/datetime";
import { buildCombinedTaskShortDescription, buildShortDescription } from "@utils/keywords";

export interface ScheduleOptions {
  date: string;
  totalMinutes?: number;
  tasks: TaskInput[];
  mode: "equal" | "lunch";
  workStart?: string;
  dayWindow?: DayWindow;
}

interface Slot {
  task: TaskInput;
  minutes: number;
  shortDescription?: string;
}

function windowMinutes(start: string, end: string): number {
  const startParts = parseTimeOfDay(start, "start");
  const endParts = parseTimeOfDay(end, "end");
  const startTotal = startParts.hours * 60 + startParts.minutes;
  const endTotal = endParts.hours * 60 + endParts.minutes;
  if (endTotal <= startTotal) {
    throw new Error(`Invalid window: ${start} must be before ${end}.`);
  }
  return endTotal - startTotal;
}

function buildCombinedBlockSlot(tasks: TaskInput[], blockMinutes: number): Slot {
  const descriptions = tasks.map((task) => task.description);
  const formatted = buildCombinedTaskShortDescription(descriptions);

  return {
    task: { description: formatted },
    minutes: blockMinutes,
    shortDescription: formatted,
  };
}

function defaultDayWindow(workStart?: string): DayWindow {
  return {
    workStart: workStart ?? "09:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    workEnd: "18:00",
  };
}

function pushEntry(entries: PlannedEntry[], slot: Slot, start: Date, end: Date): void {
  const durationMinutes = minutesBetween(start, end);
  if (durationMinutes <= 0) {
    return;
  }

  entries.push({
    taskDescription: slot.task.description,
    shortDescription: slot.shortDescription ?? buildShortDescription(slot.task.description),
    start: new Date(start),
    end,
    durationMinutes,
  });
}

function scheduleSequential(date: string, startTime: string, slots: Slot[]): PlannedEntry[] {
  let cursor = combineDateAndTime(date, startTime);
  const entries: PlannedEntry[] = [];

  for (const slot of slots) {
    if (slot.minutes <= 0) {
      continue;
    }

    const end = addMinutes(cursor, slot.minutes);
    pushEntry(entries, slot, cursor, end);
    cursor = end;
  }

  return entries;
}

function scheduleSequentialWithLunch(
  date: string,
  startTime: string,
  slots: Slot[],
  dayWindow: DayWindow,
): PlannedEntry[] {
  let cursor = combineDateAndTime(date, startTime);
  const lunchStart = combineDateAndTime(date, dayWindow.lunchStart);
  const lunchEnd = combineDateAndTime(date, dayWindow.lunchEnd);
  const workEnd = combineDateAndTime(date, dayWindow.workEnd);
  const entries: PlannedEntry[] = [];

  for (const slot of slots) {
    let remaining = slot.minutes;

    while (remaining > 0) {
      if (cursor >= lunchStart && cursor < lunchEnd) {
        cursor = lunchEnd;
      }

      if (cursor >= workEnd) {
        throw new Error(`Task "${slot.task.description}" exceeds available work time.`);
      }

      let chunkEnd: Date;
      if (cursor < lunchStart) {
        const naturalEnd = addMinutes(cursor, remaining);
        chunkEnd = naturalEnd <= lunchStart ? naturalEnd : lunchStart;
      } else {
        chunkEnd = addMinutes(cursor, remaining);
        if (chunkEnd > workEnd) {
          throw new Error(`Task "${slot.task.description}" exceeds available work time.`);
        }
      }

      const chunkMinutes = minutesBetween(cursor, chunkEnd);
      if (chunkMinutes <= 0) {
        cursor = lunchEnd;
        continue;
      }

      pushEntry(entries, slot, cursor, chunkEnd);
      remaining -= chunkMinutes;
      cursor = chunkEnd;
    }
  }

  return entries;
}

export function buildEqualSchedule(options: ScheduleOptions): PlannedEntry[] {
  if (options.tasks.length === 0) {
    throw new Error("At least one task is required to schedule time.");
  }

  const dayWindow = options.dayWindow ?? defaultDayWindow(options.workStart);
  const slots = options.tasks.map((task) => {
    if (!task.durationMinutes || task.durationMinutes <= 0) {
      throw new Error(`Task "${task.description}" is missing a valid duration.`);
    }
    return { task, minutes: task.durationMinutes };
  });

  return scheduleSequentialWithLunch(options.date, dayWindow.workStart, slots, dayWindow);
}

export function buildLunchSchedule(options: ScheduleOptions): PlannedEntry[] {
  const totalMinutes = options.totalMinutes;
  if (!totalMinutes || totalMinutes <= 0) {
    throw new Error("Total duration must be greater than zero.");
  }

  const dayWindow = options.dayWindow ?? {
    workStart: "09:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    workEnd: "18:00",
  };

  const beforeWindow = windowMinutes(dayWindow.workStart, dayWindow.lunchStart);
  const afterWindow = windowMinutes(dayWindow.lunchEnd, dayWindow.workEnd);

  const beforeMinutes = Math.floor(totalMinutes / 2);
  const afterMinutes = totalMinutes - beforeMinutes;

  if (beforeMinutes > beforeWindow) {
    throw new Error(
      `Before-lunch duration (${beforeMinutes}m) exceeds available window (${beforeWindow}m).`,
    );
  }
  if (afterMinutes > afterWindow) {
    throw new Error(
      `After-lunch duration (${afterMinutes}m) exceeds available window (${afterWindow}m).`,
    );
  }

  const beforeStart = subtractMinutesFromTime(dayWindow.lunchStart, beforeMinutes, "lunch start");
  const combinedBeforeSlot = buildCombinedBlockSlot(options.tasks, beforeMinutes);
  const combinedAfterSlot = buildCombinedBlockSlot(options.tasks, afterMinutes);

  return [
    ...scheduleSequential(options.date, beforeStart, [combinedBeforeSlot]),
    ...scheduleSequential(options.date, dayWindow.lunchEnd, [combinedAfterSlot]),
  ];
}

export function buildSchedule(options: ScheduleOptions): PlannedEntry[] {
  if (options.tasks.length === 0) {
    throw new Error("At least one task is required.");
  }

  if (options.mode === "equal") {
    return buildEqualSchedule(options);
  }

  return buildLunchSchedule(options);
}

export function validateDayWindow(dayWindow: DayWindow): void {
  const workStart = parseTimeOfDay(dayWindow.workStart, "work start");
  const lunchStart = parseTimeOfDay(dayWindow.lunchStart, "lunch start");
  const lunchEnd = parseTimeOfDay(dayWindow.lunchEnd, "lunch end");
  const workEnd = parseTimeOfDay(dayWindow.workEnd, "work end");

  const toMinutes = (value: { hours: number; minutes: number }) => value.hours * 60 + value.minutes;

  const start = toMinutes(workStart);
  const lunchStartMinutes = toMinutes(lunchStart);
  const lunchEndMinutes = toMinutes(lunchEnd);
  const end = toMinutes(workEnd);

  if (
    !(start < lunchStartMinutes && lunchStartMinutes <= lunchEndMinutes && lunchEndMinutes < end)
  ) {
    throw new Error(
      "Work and lunch times must follow workStart < lunchStart <= lunchEnd < workEnd.",
    );
  }
}
