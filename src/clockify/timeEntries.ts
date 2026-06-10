import { clockifyRequest } from "./client.js";
import type { ClockifyTimeEntry, CreateTimeEntryPayload } from "../types.js";

export async function createTimeEntry(
  apiKey: string,
  workspaceId: string,
  payload: CreateTimeEntryPayload,
): Promise<ClockifyTimeEntry> {
  return clockifyRequest<ClockifyTimeEntry>(
    apiKey,
    `/workspaces/${workspaceId}/time-entries`,
    {
      method: "POST",
      body: {
        start: payload.start,
        end: payload.end,
        description: payload.description,
        projectId: payload.projectId,
        billable: payload.billable ?? false,
      },
    },
  );
}
