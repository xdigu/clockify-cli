# Project Record — clockify-cli

Central record of decisions, action items, and roadmap for the Clockify time-tracking CLI. Updated as the project evolves.

---

## Project overview

**clockify-cli** is an interactive Node.js CLI that helps log daily work to [Clockify](https://clockify.me) through guided prompts: total duration, tasks performed, time-split strategy, project association, and auto-generated short descriptions.

**Repository:** `/private/var/www/github/xdigu/clockify-cli` (greenfield)

---

## Decisions

### Runtime & tooling

| Decision           | Choice                             | Rationale                                             | Date       |
| ------------------ | ---------------------------------- | ----------------------------------------------------- | ---------- |
| Language / runtime | Node.js (ESM, TypeScript)          | User preference                                       | 2026-06-09 |
| Package manager    | **Yarn** (`yarn.lock` committed)   | User preference; use `yarn` exclusively, not npm/pnpm | 2026-06-09 |
| CLI framework      | Commander                          | Subcommands: `setup`, `log`                           | 2026-06-09 |
| Prompts            | `@inquirer/prompts`                | Lists, confirm, hidden API key input                  | 2026-06-09 |
| HTTP client        | Native `fetch` (Node 18+)          | No extra dependency                                   | 2026-06-09 |
| Test runner        | **Jest** + `ts-jest`               | User preference (replacing Vitest)                    | 2026-06-09 |
| Coverage gate      | **95% minimum**                    | Company dev-standards policy                          | 2026-06-09 |
| Dev execution      | `tsx` for dev; optional `tsc` emit | Simple bootstrap                                      | 2026-06-09 |

### Authentication & config

| Decision            | Choice                                                          | Rationale                                                        | Date       |
| ------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| Clockify auth model | Static API key via `X-Api-Key` header                           | Clockify public API does **not** support OAuth or refresh tokens | 2026-06-09 |
| First-run setup     | Interactive wizard: paste API key + pick workspace              | User preference                                                  | 2026-06-09 |
| Config location     | `~/.config/clockify-cli/config.json` (mode `0600`)              | Standard XDG-style path, restrictive permissions                 | 2026-06-09 |
| Config fields       | `apiKey`, `workspaceId`, `workspaceName`, optional day defaults | Supports setup + sensible lunch/work defaults                    | 2026-06-09 |
| Env override        | `CLOCKIFY_API_KEY` for CI/testing                               | Keeps secrets out of test fixtures                               | 2026-06-09 |
| API base URL        | `https://api.clockify.me/api/v1`                                | Official Clockify REST API                                       | 2026-06-09 |

### User experience — log flow

| Decision            | Choice                                                                                           | Rationale                            | Date       |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ | ---------- |
| Duration input      | Flexible parsing: `8`, `8h`, `7h30m`, `7.5`                                                      | Natural daily input                  | 2026-06-09 |
| Task input          | One task per prompt; blank line ends list                                                        | Simple multi-task capture            | 2026-06-09 |
| Split mode          | **Ask user** each session: equal share **or** before/after lunch                                 | User requirement                     | 2026-06-09 |
| Equal share         | Total duration ÷ number of tasks                                                                 | Even distribution                    | 2026-06-09 |
| Lunch split         | Default window `09:00–18:00`, lunch `12:00–13:00`; assign tasks to `before` / `after` / `both`   | Matches real work-day pattern        | 2026-06-09 |
| Project association | Fetch projects once; numbered picker per entry; optional repeat-last                             | User requirement                     | 2026-06-09 |
| Short description   | Keyword extraction: preserve ticket IDs (`PROJ-123`), strip stop words, ~6 tokens, max ~50 chars | User preference over truncate or LLM | 2026-06-09 |
| Before submit       | Preview table + explicit confirm                                                                 | Prevent accidental API writes        | 2026-06-09 |
| Default date        | Today; overridable via `--date`                                                                  | Daily logging use case               | 2026-06-09 |
| Timezone            | Accept local times; convert to UTC ISO 8601 for API                                              | Clockify requires UTC timestamps     | 2026-06-09 |

### Clockify API endpoints (v1 scope)

| Operation               | Method | Endpoint                                           |
| ----------------------- | ------ | -------------------------------------------------- |
| Validate / current user | GET    | `/user`                                            |
| List workspaces         | GET    | `/workspaces`                                      |
| List projects           | GET    | `/workspaces/{workspaceId}/projects?page-size=500` |
| Create time entry       | POST   | `/workspaces/{workspaceId}/time-entries`           |

---

## Action items

### In progress

_Jest migration complete. 65 tests passing. Remaining v1 work: README, conventions, yarn install verification._

### Pending (v1 implementation order)

1. **Scaffold** — ✅ Node.js ESM + TypeScript with Yarn, Commander, Jest + ts-jest, bin entry `clockify-cli`
2. **Config & setup** — Config store + interactive `clockify-cli setup` wizard (API key + workspace)
3. **Clockify client** — HTTP wrapper; user, workspaces, projects, create time entry
4. **Time utilities** — Duration parser, lunch/equal schedule builder, keyword short-name generator + unit tests
5. **Log command** — Full interactive `clockify-cli log` flow: tasks → split mode → project picker → preview → submit
6. **Docs & quality** — README, `.cursor/rules/project-runtime-conventions.mdc`, 95% coverage in yarn scripts

### Completed

- [x] Initial requirements gathering and plan draft (2026-06-09)
- [x] Confirmed Node.js + interactive API key setup (2026-06-09)
- [x] Confirmed split-mode UX (ask equal vs lunch each session) (2026-06-09)
- [x] Confirmed keyword-based short names (2026-06-09)
- [x] Confirmed Yarn as package manager (2026-06-09)
- [x] Created `project-record.md` (2026-06-09)
- [x] Migrated test suite from Vitest to Jest (2026-06-09)

---

## Roadmap

### v1 — Interactive daily logger (current target)

- `yarn clockify-cli setup` — one-time API key and workspace configuration
- `yarn clockify-cli log` — guided time entry creation
- Equal or lunch-based time splitting
- Project picker from live Clockify project list
- Keyword-based entry descriptions
- Preview before submit

### v2 — Enhancements (future, not agreed for v1)

- Optional Clockify **task** and **tag** selection after project pick
- `--project-last` flag to reuse previous project within a session
- Edit or delete existing entries from CLI
- Persist recent project/task preferences locally

### Out of scope (explicitly deferred)

- OAuth / refresh-token auth (not supported by Clockify API)
- Web UI or background timer daemon
- Custom Clockify integration development beyond public REST API

---

## Open questions

_None currently._

---

## Change log

| Date       | Change                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| 2026-06-09 | Initial project record created from planning conversation               |
| 2026-06-09 | Added Yarn as sole package manager                                      |
| 2026-06-09 | Documented Clockify API-key auth (no OAuth)                             |
| 2026-06-09 | Switched test runner from Vitest to Jest + ts-jest                      |
| 2026-06-09 | Completed Vitest → Jest migration (`jest.config.cjs`, 65 tests passing) |
