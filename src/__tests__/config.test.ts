import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "@jest/globals";
import { loadConfig, resolveApiKey, saveConfig } from "../config/store";

describe("config store", () => {
  let tempDir = "";
  const originalConfigDir = process.env.CLOCKIFY_CONFIG_DIR;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }

    if (originalConfigDir === undefined) {
      delete process.env.CLOCKIFY_CONFIG_DIR;
    } else {
      process.env.CLOCKIFY_CONFIG_DIR = originalConfigDir;
    }
    delete process.env.CLOCKIFY_API_KEY;
  });

  it("saves and loads config", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "clockfy-cli-"));
    process.env.CLOCKIFY_CONFIG_DIR = tempDir;

    const config = {
      apiKey: "secret-key",
      workspaceId: "ws-1",
      workspaceName: "Main",
    };

    await saveConfig(config);
    const loaded = await loadConfig();
    expect(loaded).toEqual(config);

    const raw = await readFile(join(tempDir, "config.json"), "utf8");
    expect(raw).toContain("secret-key");
    expect(resolveApiKey(config)).toBe("secret-key");
  });

  it("prefers env override for api key", () => {
    process.env.CLOCKIFY_API_KEY = "env-key";
    expect(
      resolveApiKey({
        apiKey: "file-key",
        workspaceId: "ws",
        workspaceName: "Main",
      }),
    ).toBe("env-key");
  });

  it("returns null for invalid stored config", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "clockfy-cli-"));
    process.env.CLOCKIFY_CONFIG_DIR = tempDir;

    await writeFile(
      join(tempDir, "config.json"),
      JSON.stringify({ apiKey: "", workspaceId: "" }),
      "utf8",
    );

    await expect(loadConfig()).resolves.toBeNull();
  });

  it("returns null when config file is missing", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "clockfy-cli-"));
    process.env.CLOCKIFY_CONFIG_DIR = tempDir;
    await expect(loadConfig()).resolves.toBeNull();
  });

  it("returns null api key when config and env are missing", () => {
    expect(resolveApiKey(null)).toBeNull();
  });
});
