import { confirm, input, password, select } from "@inquirer/prompts";
import { ClockifyApiError } from "@clockify/client";
import { getCurrentUser, listWorkspaces } from "@clockify/user";
import { loadConfig, saveConfig } from "@config/store";
import { parseTimeOfDay, TIME_INPUT_EXAMPLES } from "@utils/datetime";

export interface SetupWizardDeps {
  loadConfigFn?: typeof loadConfig;
  saveConfigFn?: typeof saveConfig;
  getCurrentUserFn?: typeof getCurrentUser;
  listWorkspacesFn?: typeof listWorkspaces;
  promptPassword?: typeof password;
  promptConfirm?: typeof confirm;
  promptSelect?: typeof select;
  promptInput?: typeof input;
  log?: (...args: unknown[]) => void;
}

type SetupMode = "schedule" | "credentials";

function validateTime(value: string, label: string): true | string {
  try {
    parseTimeOfDay(value, label);
    return true;
  } catch (error) {
    return (error as Error).message;
  }
}

async function promptSchedule(
  promptInputFn: typeof input,
  existing: AppConfig | null,
): Promise<Pick<AppConfig, "workStart" | "lunchStart" | "lunchEnd" | "workEnd">> {
  const workStart = await promptInputFn({
    message: `Default work start (e.g. ${TIME_INPUT_EXAMPLES}):`,
    default: existing?.workStart ?? "09:00",
    validate: (value) => validateTime(value, "work start"),
  });
  const lunchStart = await promptInputFn({
    message: `Default lunch start (e.g. ${TIME_INPUT_EXAMPLES}):`,
    default: existing?.lunchStart ?? "12:00",
    validate: (value) => validateTime(value, "lunch start"),
  });
  const lunchEnd = await promptInputFn({
    message: `Default lunch end (e.g. ${TIME_INPUT_EXAMPLES}):`,
    default: existing?.lunchEnd ?? "13:00",
    validate: (value) => validateTime(value, "lunch end"),
  });
  const workEnd = await promptInputFn({
    message: `Default work end (e.g. ${TIME_INPUT_EXAMPLES}):`,
    default: existing?.workEnd ?? "18:00",
    validate: (value) => validateTime(value, "work end"),
  });

  return { workStart, lunchStart, lunchEnd, workEnd };
}

async function promptCredentials(
  deps: SetupWizardDeps,
  existing: AppConfig | null,
): Promise<Pick<AppConfig, "apiKey" | "workspaceId" | "workspaceName">> {
  const getCurrentUserFn = deps.getCurrentUserFn ?? getCurrentUser;
  const listWorkspacesFn = deps.listWorkspacesFn ?? listWorkspaces;
  const promptPasswordFn = deps.promptPassword ?? password;
  const promptSelectFn = deps.promptSelect ?? select;

  const apiKey = await promptPasswordFn({
    message: "Clockify API key (Profile Settings → API):",
    mask: "*",
    validate: (value) => (value.trim() ? true : "API key is required."),
  });

  let workspaces;
  try {
    await getCurrentUserFn(apiKey.trim());
    workspaces = await listWorkspacesFn(apiKey.trim());
  } catch (error) {
    if (error instanceof ClockifyApiError && error.status === 401) {
      throw new Error("Invalid API key. Generate one in Clockify Profile Settings.", {
        cause: error,
      });
    }
    throw error;
  }

  if (workspaces.length === 0) {
    throw new Error("No Clockify workspaces found for this API key.");
  }

  const defaultWorkspaceId = existing?.workspaceId;
  const workspaceId = await promptSelectFn({
    message: "Select workspace:",
    choices: workspaces.map((workspace) => ({
      name: workspace.name,
      value: workspace.id,
    })),
    default: defaultWorkspaceId,
  });

  const workspaceName =
    workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? "Workspace";

  return {
    apiKey: apiKey.trim(),
    workspaceId,
    workspaceName,
  };
}

export async function runSetupWizard(
  force = false,
  deps: SetupWizardDeps = {},
): Promise<AppConfig> {
  const loadConfigFn = deps.loadConfigFn ?? loadConfig;
  const saveConfigFn = deps.saveConfigFn ?? saveConfig;
  const promptConfirmFn = deps.promptConfirm ?? confirm;
  const promptSelectFn = deps.promptSelect ?? select;
  const promptInputFn = deps.promptInput ?? input;
  const logFn = deps.log ?? console.log;

  const existing = await loadConfigFn();
  if (existing && !force) {
    const reuse = await promptConfirmFn({
      message: "Configuration already exists. Reconfigure?",
      default: false,
    });
    if (!reuse) {
      return existing;
    }
  }

  let setupMode: SetupMode = "credentials";
  if (existing?.apiKey) {
    setupMode = await promptSelectFn<SetupMode>({
      message: "What would you like to update?",
      choices: [
        { name: "Work and lunch times only (keep API key and workspace)", value: "schedule" },
        { name: "API key and workspace", value: "credentials" },
      ],
    });
  }

  let credentials: Pick<AppConfig, "apiKey" | "workspaceId" | "workspaceName">;
  if (setupMode === "schedule" && existing) {
    credentials = {
      apiKey: existing.apiKey,
      workspaceId: existing.workspaceId,
      workspaceName: existing.workspaceName,
    };
  } else {
    credentials = await promptCredentials(deps, existing);
  }

  const schedule = await promptSchedule(promptInputFn, existing);

  const config: AppConfig = {
    ...credentials,
    ...schedule,
  };

  await saveConfigFn(config);
  logFn(`Saved configuration for workspace "${config.workspaceName}".`);
  return config;
}
