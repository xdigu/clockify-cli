# @xdigu/clockify-cli

> Interactive CLI for logging time entries to [Clockify](https://clockify.me) from the terminal.

---

## Overview

`@xdigu/clockify-cli` is a command-line tool that lets developers and professionals log billable hours directly in their terminal without opening a browser. It walks you through an interactive prompts-based flow: configure your Clockify API key and workspace, then log time for tasks worked on during the day — with smart defaults built around your typical work hours and lunch schedule.

---

## Features

- Two subcommands: `setup` and `log`
- Secure API key storage on disk (`~/.config/clockify-cli/config.json`, mode `0600`)
- Configurable work/lunch schedule defaults
- Two time-split modes: per-task duration or before/after lunch split
- Project picker from the Clockify API with client name support
- Config directory overridable via `CLOCKIFY_CONFIG_DIR` environment variable
- Runtime config resolution from `CLOCKIFY_API_KEY` takes precedence over file storage

---

## Installation

### npm

```bash
npm install -g @xdigu/clockify-cli
```

### yarn

```bash
yarn global add @xdigu/clockify-cli
```

### pnpm

```bash
pnpm add -g @xdigu/clockify-cli
```

---

## Prerequisites

You need a Clockify API key to use this CLI. Generate one in your Clockify account:

1. Open [clockify.me](https://clockify.me) and log in
2. Click your **profile picture** (top-right corner) → **Preferences**
3. Go to the **Advanced** tab
4. In the **API Key** section, click **Generate**
5. **Immediately copy** the key — it will not be visible after you close the window

Store the key securely (e.g., in a password manager). If you lose it, generate a new one following the same steps.

---

## Quick Start

```bash
# 1. Install the package
npm install -g @xdigu/clockify-cli

# 2. Run setup (enter your Clockify API key and select a workspace)
clockify-cli setup

# 3. Log time for today
clockify-cli log

# Done. Entries are created in Clockify automatically.
```

---

## Usage

### Commands

#### `clockify-cli setup [--force]`

Interactive wizard that configures your API key, workspace, and work/lunch schedule defaults.

| Option     | Description                                       | Default        |
|------------|----------------------------------------------------|----------------|
| `--force`  | Reconfigure even if a config file already exists   | `false` (skip) |

If a config already exists and `--force` is not provided, the wizard asks whether to reconfigure. When credentials are already set, it lets you update **work time** or **credentials** only.

#### `clockify-cli log [--date <YYYY-MM-DD>] [--project-last]`

Interactive flow for logging time. You enter task descriptions and durations (or total hours with a lunch split), pick a project, preview the entries, and confirm before they are created in Clockify.

| Option           | Description                                              | Default     |
|------------------|----------------------------------------------------------|-------------|
| `--date <date>`  | Date to create entries for                               | Today       |
| `--project-last` | Default the project picker to your previous selection      | Off         |

### Split Modes

When running `clockify-cli log`, you choose one of two modes:

1. **Set duration for each task** — enter a manual duration (e.g., `2h`, `1h30m`, `90`) per task. Tasks are scheduled sequentially across the work day, automatically skipping your lunch block.

2. **Split before and after lunch** — enter one total duration (e.g., `8` or `8h`). The tool splits it 50/50 into before-lunch and after-lunch blocks. Each block logs **all** task names as a single combined entry.

### Duration formats

All duration inputs accept any of the following formats:

| Input    | Output (minutes)   |
|----------|--------------------|
| `8`      | 480 min             |
| `8h`     | 480 min             |
| `7h30m`  | 450 min             |
| `7.5`    | 450 min             |

### Time formats (during setup)

Work/lunch times accept these formats: `9`, `930`, `1330`, `9`, `9h30m`. Example:

```bash
clockify-cli setup

# Prompt → Default work start (e.g. 9, 930, 1330, 9h, or 9h30m): 8h30m
```

---

## Configuration

Configuration is stored as JSON at `~/.config/clockify-cli/config.json`. The structure:

```jsonc
{
  "apiKey": "your-clockify-api-key",
  "workspaceId": "abc123...",
  "workspaceName": "Acme Corp",
  "workStart": "08:30",
  "lunchStart": "12:00",
  "lunchEnd":   "13:00",
  "workEnd":    "17:30"
}
```

### Default values

| Field         | Default  |
|---------------|----------|
| `workStart`   | `09:00`  |
| `lunchStart`  | `12:00`  |
| `lunchEnd`    | `13:00`  |
| `workEnd`     | `18:00`  |

### Environment variables

| Variable                 | Purpose                                  |
|--------------------------|------------------------------------------|
| `CLOCKIFY_API_KEY`       | Overrides the API key from config file   |
| `CLOCKIFY_CONFIG_DIR`    | Location of the config directory (default `~/.config/clockify-cli`) |

The config directory is created with mode `0700` and the config file with mode `0600`.

---

## Examples

### Log time for today (quick flow)

```bash
clockify-cli log
```

You'll be prompted to:

1. Confirm or change today's date
2. Choose split mode (equal per-task vs before/after lunch)
3. Enter task descriptions (semicolon-separated, e.g., `Fix login bug; Review PR #42`)
4. Enter durations (per-task mode) or total hours (lunch split mode)
5. Select a project from your workspace
6. Preview and confirm

### Log time for a specific date

```bash
clockify-cli log --date 2026-06-11
```

The workflow is the same, but all entries are created for June 11 instead of today.

### Reconfigure credentials only

```bash
clockify-cli setup --force
# → Choose "API key and workspace" when prompted to select update type.
```
---

## FAQ

### Where is my config file stored?

By default: `~/.config/clockify-cli/config.json`. Override the directory with the `CLOCKIFY_CONFIG_DIR` environment variable.

### Can I use the API key from an environment variable instead of the config file?

Yes. Set `CLOCKIFY_API_KEY` in your shell — it takes priority over any value stored on disk.

### What happens if I don't have a config yet?

Running `clockify-cli log` without a config automatically triggers the setup wizard (`clockify setup`) so you can configure things immediately.

### Can I use fractional hours like `"7.5"`?

Yes. `7.5` is interpreted as 7 hours and 30 minutes (450 minutes).

### What happens if a task would exceed my work day's available time?

The tool throws an error: `Task "<name>" exceeds available work time.` Reduce your total or adjust your schedule in `.config/clockify-cli/config.json` via `clockify-cli setup`.
