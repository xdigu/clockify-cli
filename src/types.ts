export interface AppConfig {
  apiKey: string;
  workspaceId: string;
  workspaceName: string;
  workStart?: string;
  lunchStart?: string;
  lunchEnd?: string;
  workEnd?: string;
}

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
}

export interface ClockifyClientInfo {
  id: string;
  name: string;
}

export interface ClockifyProject {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  archived: boolean;
}

export interface CreateTimeEntryPayload {
  start: string;
  end: string;
  description: string;
  projectId: string;
  billable?: boolean;
}

export interface ClockifyTimeEntry {
  id: string;
  description?: string;
  start: string;
  end?: string;
  projectId?: string;
}

export type LunchAssignment = "before" | "after" | "both";

export interface TaskInput {
  description: string;
  assignment?: LunchAssignment;
}

export interface PlannedEntry {
  taskDescription: string;
  shortDescription: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  projectId?: string;
  projectName?: string;
}

export interface DayWindow {
  workStart: string;
  lunchStart: string;
  lunchEnd: string;
  workEnd: string;
}
