import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useGetCurrentUser } from "./useGetCurrentUser";

import { Project, User, APIErrorResponse } from "../types";
import { usePromise } from "@raycast/utils";

export function useGetProjects() {
  const { isLoading: isLoadingUser, currentUser } = useGetCurrentUser();

  const {
    isLoading,
    data: projects,
    mutate,
  } = usePromise(getProjects, [], {
    execute: !isLoadingUser && !!currentUser,
    failureToastOptions: {
      title: "Could not fetch projects",
    },
  });

  async function leaveProject(project: Project) {
    const toast = await showToast(Toast.Style.Animated, "Leaving project", project.name);
    try {
      await mutate(removeUserFromProject(project, currentUser), {
        optimisticUpdate(data) {
          const updatedProjects = (data ?? []).filter((p) => p.id !== project.id);
          return updatedProjects;
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Succesfully left the project";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not leave project";
    }
  }

  return { projects, isLoading: isLoadingUser || isLoading, leaveProject };
}

async function getProjects(): Promise<Project[]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues<Preferences>();

  const limit = 100;
  let offset = 0;
  let hasMore = true;
  let projects: Project[] = [];

  while (hasMore) {
    const response = await fetch(`https://api.zeplin.dev/v1/projects?status=active&limit=${limit}&offset=${offset}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      const result = (await response.json()) as APIErrorResponse;
      throw new Error(result.message);
    }

    const result = (await response.json()) as Project[];
    projects = projects.concat(result);

    if (result.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return projects;
}

async function removeUserFromProject(project: Project, member?: User) {
  if (!member) {
    throw new Error("No current user found, please try again later");
  }

  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  const response = await fetch(`https://api.zeplin.dev/v1/projects/${project.id}/members/${member.id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    const result = (await response.json()) as APIErrorResponse;
    throw new Error(result.message);
  }
}
