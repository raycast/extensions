import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getAllProjects } from "../api/projects";

/**
 * Loads every project and remembers which one the command last showed.
 * @param commandName - Keeps each command's pick separate.
 */
export function useProjects(commandName: string) {
  const [savedProjectKey, setProjectKey] = useCachedState<string | undefined>(`${commandName}:project`, undefined);
  const { data: projects = [], isLoading } = useCachedPromise(getAllProjects, []);
  const project = projects.find(({ project_key }) => project_key === savedProjectKey) ?? projects.at(0);

  return { projects, project, isLoading, setProjectKey };
}
