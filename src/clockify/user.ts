import { clockifyRequest } from "./client.js";
import type { ClockifyUser, ClockifyWorkspace } from "../types.js";

export async function getCurrentUser(apiKey: string): Promise<ClockifyUser> {
  return clockifyRequest<ClockifyUser>(apiKey, "/user");
}

export async function listWorkspaces(apiKey: string): Promise<ClockifyWorkspace[]> {
  return clockifyRequest<ClockifyWorkspace[]>(apiKey, "/workspaces");
}
