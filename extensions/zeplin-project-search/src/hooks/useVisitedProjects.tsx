import { LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import type { Project } from "../types";

const VISITED_ZEPLIN_PROJECTS_KEY = "VISITED_ZEPLIN_PROJECTS";
const VISITED_ZEPLIN_FILES_LENGTH = 10;

async function loadVisitedProjects() {
  const item = await LocalStorage.getItem<string>(VISITED_ZEPLIN_PROJECTS_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as Project[];
  } else {
    return [];
  }
}

async function saveVisitedProject(project: Project[]) {
  const data = JSON.stringify(project);
  await LocalStorage.setItem(VISITED_ZEPLIN_PROJECTS_KEY, data);
}

export async function clearVisitedProjects() {
  return await LocalStorage.removeItem(VISITED_ZEPLIN_PROJECTS_KEY);
}

export function useVisitedProjects() {
  const [projects, setProjects] = useState<Project[]>();

  useEffect(() => {
    loadVisitedProjects().then(setProjects);
  }, []);

  function visitProject(project: Project) {
    const updatedProjects = [project, ...(projects?.filter((p) => p.id !== project.id) ?? [])].slice(
      0,
      VISITED_ZEPLIN_FILES_LENGTH,
    );
    setProjects(updatedProjects);
    saveVisitedProject(updatedProjects);
  }

  function removeProjectFromVisit(project: Project) {
    const updatedProjects = (projects || []).filter((p) => p.id !== project.id);
    setProjects(updatedProjects);
    saveVisitedProject(updatedProjects);
  }

  return { projects, visitProject, removeProjectFromVisit };
}
