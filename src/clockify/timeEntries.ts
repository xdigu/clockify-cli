import { clockifyRequest } from "@clockify/client";

export async function createTimeEntry(
  apiKey: string,
  workspaceId: string,
  payload: CreateTimeEntryPayload,
): Promise<ClockifyTimeEntry> {
  return clockifyRequest<ClockifyTimeEntry>(apiKey, `/workspaces/${workspaceId}/time-entries`, {
    method: "POST",
    body: {
      start: payload.start,
      end: payload.end,
      description: payload.description,
      projectId: payload.projectId,
      billable: payload.billable ?? false,
    },
  });
}
