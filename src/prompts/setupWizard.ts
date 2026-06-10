import { confirm, input, password, select } from "@inquirer/prompts";
import { ClockifyApiError } from "../clockify/client.js";
import { getCurrentUser, listWorkspaces } from "../clockify/user.js";
import { loadConfig, saveConfig } from "../config/store.js";

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

export async function runSetupWizard(
  force = false,
  deps: SetupWizardDeps = {},
): Promise<AppConfig> {
  const loadConfigFn = deps.loadConfigFn ?? loadConfig;
  const saveConfigFn = deps.saveConfigFn ?? saveConfig;
  const getCurrentUserFn = deps.getCurrentUserFn ?? getCurrentUser;
  const listWorkspacesFn = deps.listWorkspacesFn ?? listWorkspaces;
  const promptPasswordFn = deps.promptPassword ?? password;
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
      throw new Error("Invalid API key. Generate one in Clockify Profile Settings.");
    }
    throw error;
  }

  if (workspaces.length === 0) {
    throw new Error("No Clockify workspaces found for this API key.");
  }

  const workspaceId = await promptSelectFn({
    message: "Select workspace:",
    choices: workspaces.map((workspace) => ({
      name: workspace.name,
      value: workspace.id,
    })),
  });

  const workspaceName =
    workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? "Workspace";

  const workStart = await promptInputFn({
    message: "Default work start (HH:MM):",
    default: existing?.workStart ?? "09:00",
  });
  const lunchStart = await promptInputFn({
    message: "Default lunch start (HH:MM):",
    default: existing?.lunchStart ?? "12:00",
  });
  const lunchEnd = await promptInputFn({
    message: "Default lunch end (HH:MM):",
    default: existing?.lunchEnd ?? "13:00",
  });
  const workEnd = await promptInputFn({
    message: "Default work end (HH:MM):",
    default: existing?.workEnd ?? "18:00",
  });

  const config: AppConfig = {
    apiKey: apiKey.trim(),
    workspaceId,
    workspaceName,
    workStart,
    lunchStart,
    lunchEnd,
    workEnd,
  };

  await saveConfigFn(config);
  logFn(`Saved configuration for workspace "${workspaceName}".`);
  return config;
}
