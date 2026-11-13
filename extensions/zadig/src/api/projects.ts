import { request } from "./request";

export type Project = {
  project_key: string;
  project_name: string;
  deploy_type: string;
};

type ProjectPage = {
  total: number;
  projects: Project[] | null;
};

export async function getAllProjects() {
  const projects: Project[] = [];

  for (let pageNum = 1; ; pageNum++) {
    const page = await request<ProjectPage>("/projects/project", { params: { pageNum } });
    const pageProjects = page.projects ?? [];

    projects.push(...pageProjects);

    if (pageProjects.length === 0 || projects.length >= page.total) {
      return projects;
    }
  }
}
