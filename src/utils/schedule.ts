import { addMinutes, combineDateAndTime, minutesBetween, parseTimeOfDay } from "./datetime.js";
import { buildShortDescription } from "./keywords.js";

export interface ScheduleOptions {
  date: string;
  totalMinutes: number;
  tasks: TaskInput[];
  mode: "equal" | "lunch";
  workStart?: string;
  dayWindow?: DayWindow;
}

interface Slot {
  task: TaskInput;
  minutes: number;
}

function splitMinutes(total: number, count: number): number[] {
  if (count <= 0) {
    throw new Error("At least one task is required to schedule time.");
  }

  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
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

function buildSlotsForBlock(
  tasks: TaskInput[],
  blockMinutes: number,
  include: (assignment: LunchAssignment | undefined) => boolean,
): Slot[] {
  const eligible = tasks.filter((task) => include(task.assignment));
  if (eligible.length === 0) {
    throw new Error("Each time block must have at least one assigned task.");
  }

  const minutesPerTask = splitMinutes(blockMinutes, eligible.length);
  return eligible.map((task, index) => ({
    task,
    minutes: minutesPerTask[index] ?? 0,
  }));
}

function scheduleSequential(
  date: string,
  startTime: string,
  slots: Slot[],
): PlannedEntry[] {
  let cursor = combineDateAndTime(date, startTime);
  const entries: PlannedEntry[] = [];

  for (const slot of slots) {
    if (slot.minutes <= 0) {
      continue;
    }

    const end = addMinutes(cursor, slot.minutes);
    entries.push({
      taskDescription: slot.task.description,
      shortDescription: buildShortDescription(slot.task.description),
      start: new Date(cursor),
      end,
      durationMinutes: slot.minutes,
    });
    cursor = end;
  }

  return entries;
}

export function buildEqualSchedule(options: ScheduleOptions): PlannedEntry[] {
  const workStart = options.workStart ?? "09:00";
  const minutesPerTask = splitMinutes(options.totalMinutes, options.tasks.length);
  const slots = options.tasks.map((task, index) => ({
    task,
    minutes: minutesPerTask[index] ?? 0,
  }));

  return scheduleSequential(options.date, workStart, slots);
}

export function buildLunchSchedule(options: ScheduleOptions): PlannedEntry[] {
  const dayWindow = options.dayWindow ?? {
    workStart: "09:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    workEnd: "18:00",
  };

  const beforeWindow = windowMinutes(dayWindow.workStart, dayWindow.lunchStart);
  const afterWindow = windowMinutes(dayWindow.lunchEnd, dayWindow.workEnd);
  const totalWindow = beforeWindow + afterWindow;

  if (options.totalMinutes > totalWindow) {
    throw new Error(
      `Total duration (${options.totalMinutes}m) exceeds available work window (${totalWindow}m).`,
    );
  }

  const beforeMinutes = Math.round((options.totalMinutes * beforeWindow) / totalWindow);
  const afterMinutes = options.totalMinutes - beforeMinutes;

  const beforeSlots = buildSlotsForBlock(options.tasks, beforeMinutes, (assignment) =>
    assignment === "before" || assignment === "both",
  );
  const afterSlots = buildSlotsForBlock(options.tasks, afterMinutes, (assignment) =>
    assignment === "after" || assignment === "both",
  );

  return [
    ...scheduleSequential(options.date, dayWindow.workStart, beforeSlots),
    ...scheduleSequential(options.date, dayWindow.lunchEnd, afterSlots),
  ];
}

export function buildSchedule(options: ScheduleOptions): PlannedEntry[] {
  if (options.totalMinutes <= 0) {
    throw new Error("Total duration must be greater than zero.");
  }

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

  const toMinutes = (value: { hours: number; minutes: number }) =>
    value.hours * 60 + value.minutes;

  const start = toMinutes(workStart);
  const lunchStartMinutes = toMinutes(lunchStart);
  const lunchEndMinutes = toMinutes(lunchEnd);
  const end = toMinutes(workEnd);

  if (!(start < lunchStartMinutes && lunchStartMinutes <= lunchEndMinutes && lunchEndMinutes < end)) {
    throw new Error("Work and lunch times must follow workStart < lunchStart <= lunchEnd < workEnd.");
  }
}
