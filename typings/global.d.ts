interface AppConfig {
  apiKey: string;
  workspaceId: string;
  workspaceName: string;
  workStart?: string;
  lunchStart?: string;
  lunchEnd?: string;
  workEnd?: string;
}

interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
}

interface ClockifyWorkspace {
  id: string;
  name: string;
}

interface ClockifyClientInfo {
  id: string;
  name: string;
}

interface ClockifyProject {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  archived: boolean;
}

interface CreateTimeEntryPayload {
  start: string;
  end: string;
  description: string;
  projectId: string;
  billable?: boolean;
}

interface ClockifyTimeEntry {
  id: string;
  description?: string;
  start: string;
  end?: string;
  projectId?: string;
}

type LunchAssignment = "before" | "after" | "both";

interface TaskInput {
  description: string;
  assignment?: LunchAssignment;
}

interface PlannedEntry {
  taskDescription: string;
  shortDescription: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  projectId?: string;
  projectName?: string;
}

interface DayWindow {
  workStart: string;
  lunchStart: string;
  lunchEnd: string;
  workEnd: string;
}
