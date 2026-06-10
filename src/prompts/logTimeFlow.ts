import { confirm, input, select } from "@inquirer/prompts";
import { ClockifyApiError } from "../clockify/client.js";
import { listProjects } from "../clockify/projects.js";
import { createTimeEntry } from "../clockify/timeEntries.js";
import { loadConfig, resolveApiKey } from "../config/store.js";
import { todayDateString, formatLocalDateTime, toIsoUtc } from "../utils/datetime.js";
import { parseDurationToMinutes, formatMinutes } from "../utils/duration.js";
import { buildSchedule, validateDayWindow } from "../utils/schedule.js";
import { runSetupWizard } from "./setupWizard.js";

export interface LogFlowDeps {
  loadConfigFn?: typeof loadConfig;
  resolveApiKeyFn?: typeof resolveApiKey;
  listProjectsFn?: typeof listProjects;
  createTimeEntryFn?: typeof createTimeEntry;
  runSetupWizardFn?: typeof runSetupWizard;
  promptInput?: typeof input;
  promptSelect?: typeof select;
  promptConfirm?: typeof confirm;
  log?: (...args: unknown[]) => void;
}

function projectLabel(project: ClockifyProject): string {
  return project.clientName ? `${project.name} (${project.clientName})` : project.name;
}

async function collectTasks(
  promptInputFn: typeof input,
  promptSelectFn: typeof select,
  mode: "equal" | "lunch",
): Promise<TaskInput[]> {
  const tasks: TaskInput[] = [];

  while (true) {
    const description = await promptInputFn({
      message: tasks.length === 0 ? "Describe a task you worked on:" : "Next task (leave blank to finish):",
      validate: (value) => {
        if (tasks.length === 0 && !value.trim()) {
          return "At least one task is required.";
        }
        return true;
      },
    });

    if (!description.trim()) {
      break;
    }

    const task: TaskInput = { description: description.trim() };

    if (mode === "lunch") {
      task.assignment = await promptSelectFn<LunchAssignment>({
        message: `When did you work on "${task.description}"?`,
        choices: [
          { name: "Before lunch", value: "before" },
          { name: "After lunch", value: "after" },
          { name: "Both (before and after)", value: "both" },
        ],
      });
    }

    tasks.push(task);
  }

  return tasks;
}

function printPreview(entries: PlannedEntry[], logFn: (...args: unknown[]) => void): void {
  logFn("\nPlanned time entries:\n");
  for (const [index, entry] of entries.entries()) {
    logFn(
      `${index + 1}. ${formatLocalDateTime(entry.start)} → ${formatLocalDateTime(entry.end)} (${formatMinutes(entry.durationMinutes)})`,
    );
    logFn(`   ${entry.shortDescription}`);
    logFn(`   Project: ${entry.projectName ?? "(not selected)"}\n`);
  }
}

export async function runLogTimeFlow(
  options: { date?: string; useLastProject?: boolean } = {},
  deps: LogFlowDeps = {},
): Promise<void> {
  const loadConfigFn = deps.loadConfigFn ?? loadConfig;
  const resolveApiKeyFn = deps.resolveApiKeyFn ?? resolveApiKey;
  const listProjectsFn = deps.listProjectsFn ?? listProjects;
  const createTimeEntryFn = deps.createTimeEntryFn ?? createTimeEntry;
  const runSetupWizardFn = deps.runSetupWizardFn ?? runSetupWizard;
  const promptInputFn = deps.promptInput ?? input;
  const promptSelectFn = deps.promptSelect ?? select;
  const promptConfirmFn = deps.promptConfirm ?? confirm;
  const logFn = deps.log ?? console.log;

  let config = await loadConfigFn();
  if (!config) {
    logFn("No configuration found. Running setup...");
    config = await runSetupWizardFn(true);
  }

  const apiKey = resolveApiKeyFn(config);
  if (!apiKey) {
    throw new Error("Missing API key. Run `clockfycli setup`.");
  }

  const date =
    options.date ??
    (await promptInputFn({
      message: "Date to log (YYYY-MM-DD):",
      default: todayDateString(),
    }));

  const durationInput = await promptInputFn({
    message: "How long did you work in total? (e.g. 8h, 7h30m, 7.5):",
    validate: (value) => {
      try {
        parseDurationToMinutes(value);
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : "Invalid duration.";
      }
    },
  });

  const totalMinutes = parseDurationToMinutes(durationInput);

  const splitMode = await promptSelectFn<"equal" | "lunch">({
    message: "How should time be split across tasks?",
    choices: [
      { name: "Share equally across all tasks", value: "equal" },
      { name: "Split before and after lunch", value: "lunch" },
    ],
  });

  const tasks = await collectTasks(promptInputFn, promptSelectFn, splitMode);

  let dayWindow;
  if (splitMode === "lunch") {
    dayWindow = {
      workStart: await promptInputFn({
        message: "Work start (HH:MM):",
        default: config.workStart ?? "09:00",
      }),
      lunchStart: await promptInputFn({
        message: "Lunch start (HH:MM):",
        default: config.lunchStart ?? "12:00",
      }),
      lunchEnd: await promptInputFn({
        message: "Lunch end (HH:MM):",
        default: config.lunchEnd ?? "13:00",
      }),
      workEnd: await promptInputFn({
        message: "Work end (HH:MM):",
        default: config.workEnd ?? "18:00",
      }),
    };
    validateDayWindow(dayWindow);
  }

  const workStart =
    splitMode === "equal"
      ? await promptInputFn({
          message: "Work start (HH:MM):",
          default: config.workStart ?? "09:00",
        })
      : dayWindow!.workStart;

  const plannedEntries = buildSchedule({
    date,
    totalMinutes,
    tasks,
    mode: splitMode,
    workStart,
    dayWindow,
  });

  let projects: ClockifyProject[];
  try {
    projects = await listProjectsFn(apiKey, config.workspaceId);
  } catch (error) {
    if (error instanceof ClockifyApiError && error.status === 401) {
      throw new Error("Authentication failed. Re-run `clockfycli setup`.");
    }
    throw error;
  }

  if (projects.length === 0) {
    throw new Error("No active projects found in this workspace.");
  }

  let lastProjectId: string | undefined;

  for (const entry of plannedEntries) {
    const defaultProjectId = options.useLastProject ? lastProjectId : undefined;
    const choices = projects.map((project) => ({
      name: projectLabel(project),
      value: project.id,
    }));

    const projectId = await promptSelectFn({
      message: `Project for "${entry.shortDescription}":`,
      choices,
      default: defaultProjectId,
    });

    const project = projects.find((item) => item.id === projectId);
    entry.projectId = projectId;
    entry.projectName = project ? projectLabel(project) : projectId;
    lastProjectId = projectId;
  }

  printPreview(plannedEntries, logFn);

  const shouldSubmit = await promptConfirmFn({
    message: "Create these entries in Clockify?",
    default: true,
  });

  if (!shouldSubmit) {
    logFn("Cancelled. No entries were created.");
    return;
  }

  for (const entry of plannedEntries) {
    if (!entry.projectId) {
      throw new Error("Each entry must have a project before submission.");
    }

    const created = await createTimeEntryFn(apiKey, config.workspaceId, {
      start: toIsoUtc(entry.start),
      end: toIsoUtc(entry.end),
      description: entry.shortDescription,
      projectId: entry.projectId,
      billable: false,
    });

    logFn(`Created entry ${created.id}: ${entry.shortDescription}`);
  }
}
