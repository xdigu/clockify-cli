import { clockifyRequest } from "@clockify/client";

export async function getCurrentUser(apiKey: string): Promise<ClockifyUser> {
  return clockifyRequest<ClockifyUser>(apiKey, "/user");
}

export async function listWorkspaces(apiKey: string): Promise<ClockifyWorkspace[]> {
  return clockifyRequest<ClockifyWorkspace[]>(apiKey, "/workspaces");
}
