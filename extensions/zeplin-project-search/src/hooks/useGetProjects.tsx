import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";
import { useGetCurrentUser } from "./useGetCurrentUser";

import { Project, User, APIErrorResponse } from "../types";

export function useGetProjects() {
  const { currentUser } = useGetCurrentUser();

  const [state, setState] = useState<{
    projects?: Project[];
    isLoading: boolean;
  }>({
    projects: undefined,
    isLoading: true,
  });

  useEffect(() => {
    async function fetch() {
      const projects = await getProjects();

      setState((oldState) => ({
        ...oldState,
        projects: projects,
        isLoading: false,
      }));
    }
    fetch();
  }, []);

  function leaveProject(project: Project) {
    removeUserFromProject(project, currentUser)
      .then(() => {
        const updatedProjects = (state.projects || []).filter((p) => p.id !== project.id);
        setState((oldState) => ({
          ...oldState,
          projects: updatedProjects,
        }));
      })
      .then(() => showToast(ToastStyle.Success, "Succesfully left the project"))
      .catch((error) => showToast(ToastStyle.Failure, error.message));
  }

  return { projects: state.projects, isLoading: state.isLoading, leaveProject };
}

async function getProjects(): Promise<Project[]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();

  const limit = 100;
  let offset = 0;
  let hasMore = true;
  let projects: Project[] = [];

  while (hasMore) {
    try {
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
    } catch (error) {
      console.error(error);
      showToast(ToastStyle.Failure, "Could not fetch projects");
    }
  }

  return projects;
}

async function removeUserFromProject(project: Project, member?: User) {
  if (!member) {
    throw new Error("No current user found, please try again later");
  }

  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  try {
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
  } catch (error) {
    console.error(error);
    throw error;
  }
}
