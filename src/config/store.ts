import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export function getConfigDir(): string {
  return process.env.CLOCKIFY_CONFIG_DIR ?? join(homedir(), ".config", "clockfy-cli");
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

/** @deprecated Use getConfigPath() */
export const CONFIG_DIR = getConfigDir();
/** @deprecated Use getConfigPath() */
export const CONFIG_PATH = getConfigPath();

export async function loadConfig(): Promise<AppConfig | null> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as AppConfig;
    if (!parsed.apiKey || !parsed.workspaceId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const configDir = getConfigDir();
  const configPath = getConfigPath();
  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(configPath, 0o600);
}

export function resolveApiKey(config: AppConfig | null): string | null {
  return process.env.CLOCKIFY_API_KEY ?? config?.apiKey ?? null;
}
