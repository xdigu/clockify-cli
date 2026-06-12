import { confirm, input, select } from "@inquirer/prompts";
import { ClockifyApiError } from "@clockify/client";
import { listProjects } from "@clockify/projects";
import { createTimeEntry } from "@clockify/timeEntries";
import { loadConfig, resolveApiKey } from "@config/store";
import { todayDateString, formatLocalDateTime, toIsoUtc } from "@utils/datetime";
import { parseDurationToMinutes, formatMinutes } from "@utils/duration";
import { buildSchedule, validateDayWindow } from "@utils/schedule";
import { runSetupWizard } from "@prompts/setupWizard";

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

const SCHEDULE_HINT =
  "Work and lunch times use your setup defaults. Run `clockify-cli setup` to change them.";

function dayWindowFromConfig(config: AppConfig): DayWindow {
  return {
    workStart: config.workStart ?? "09:00",
    lunchStart: config.lunchStart ?? "12:00",
    lunchEnd: config.lunchEnd ?? "13:00",
    workEnd: config.workEnd ?? "18:00",
  };
}

function parseTasksInput(raw: string): string[] {
  return raw
    .split(";")
    .map((task) => task.trim())
    .filter(Boolean);
}

async function collectTasks(
  promptInputFn: typeof input,
  mode: "equal" | "lunch",
): Promise<TaskInput[]> {
  const tasksInput = await promptInputFn({
    message: "Describe tasks you worked on (separate with ;):",
    validate: (value) => {
      if (!parseTasksInput(value).length) {
        return "At least one task is required.";
      }
      return true;
    },
  });

  const descriptions = parseTasksInput(tasksInput);
  const tasks: TaskInput[] = [];

  for (const description of descriptions) {
    const task: TaskInput = { description };

    if (mode === "equal") {
      const durationInput = await promptInputFn({
        message: `How long did you work on "${description}"? (e.g. 2h, 1h30m, 2):`,
        validate: (value) => {
          try {
            const minutes = parseDurationToMinutes(value);
            if (minutes <= 0) {
              return "Duration must be greater than zero.";
            }
            return true;
          } catch (error) {
            return (error as Error).message;
          }
        },
      });
      task.durationMinutes = parseDurationToMinutes(durationInput);
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
    throw new Error("Missing API key. Run `clockify-cli setup`.");
  }

  logFn(SCHEDULE_HINT);

  const date =
    options.date ??
    (await promptInputFn({
      message: "Date to log (YYYY-MM-DD):",
      default: todayDateString(),
    }));

  const splitMode = await promptSelectFn<"equal" | "lunch">({
    message: "How should time be split across tasks?",
    choices: [
      { name: "Set duration for each task", value: "equal" },
      {
        name: "Split before and after lunch (one entry per block, all task names)",
        value: "lunch",
      },
    ],
  });

  const tasks = await collectTasks(promptInputFn, splitMode);

  const dayWindow = dayWindowFromConfig(config);
  validateDayWindow(dayWindow);

  let totalMinutes: number | undefined;
  if (splitMode === "lunch") {
    const durationInput = await promptInputFn({
      message: "How long did you work in total? (e.g. 8h, 7h30m, 8):",
      validate: (value) => {
        try {
          const minutes = parseDurationToMinutes(value);
          if (minutes <= 0) {
            return "Duration must be greater than zero.";
          }
          return true;
        } catch (error) {
          return (error as Error).message;
        }
      },
    });
    totalMinutes = parseDurationToMinutes(durationInput);
  }

  const plannedEntries = buildSchedule({
    date,
    totalMinutes,
    tasks,
    mode: splitMode,
    workStart: dayWindow.workStart,
    dayWindow,
  });

  let projects: ClockifyProject[];
  try {
    projects = await listProjectsFn(apiKey, config.workspaceId);
  } catch (error) {
    if (error instanceof ClockifyApiError && error.status === 401) {
      throw new Error("Authentication failed. Re-run `clockify-cli setup`.", { cause: error });
    }
    throw error;
  }

  if (projects.length === 0) {
    throw new Error("No active projects found in this workspace.");
  }

  let lastProjectId: string | undefined;
  let lastTaskDescription: string | undefined;

  for (const entry of plannedEntries) {
    const isSameTaskContinuation =
      lastTaskDescription !== undefined && entry.taskDescription === lastTaskDescription;

    let projectId: string | undefined;
    if (isSameTaskContinuation && lastProjectId) {
      projectId = lastProjectId;
    } else {
      const defaultProjectId = options.useLastProject ? lastProjectId : undefined;
      const choices = projects.map((project) => ({
        name: projectLabel(project),
        value: project.id,
      }));

      projectId = await promptSelectFn({
        message: `Project for "${entry.shortDescription}":`,
        choices,
        default: defaultProjectId,
      });
    }

    const project = projects.find((item) => item.id === projectId);
    entry.projectId = projectId;
    entry.projectName = project ? projectLabel(project) : projectId;
    lastProjectId = projectId;
    lastTaskDescription = entry.taskDescription;
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
