import { clockifyRequest } from "./client.js";

interface ProjectsPage {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  archived: boolean;
}

export async function listProjects(
  apiKey: string,
  workspaceId: string,
): Promise<ClockifyProject[]> {
  const pageSize = 500;
  let page = 1;
  const projects: ClockifyProject[] = [];

  while (true) {
    const batch = await clockifyRequest<ProjectsPage[]>(
      apiKey,
      `/workspaces/${workspaceId}/projects?page-size=${pageSize}&page=${page}`,
    );

    projects.push(
      ...batch.map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        clientName: project.clientName,
        archived: project.archived,
      })),
    );

    if (batch.length < pageSize) {
      break;
    }

    page += 1;
  }

  return projects.filter((project) => !project.archived);
}
