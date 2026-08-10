import { List } from "@raycast/api";
import { useGetProjects } from "./hooks/useGetProjects";
import { useVisitedProjects } from "./hooks/useVisitedProjects";

import ProjectListItem from "./components/ProjectListItem";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [isShowingDetail] = useCachedState("show-project-details", false);
  const { projects, isLoading: isLoadingProjects, leaveProject } = useGetProjects();
  const { projects: visitedProjects, visitProject, removeProjectFromVisit } = useVisitedProjects();

  return (
    <List
      isLoading={isLoadingProjects}
      searchBarPlaceholder="Filter projects by name..."
      isShowingDetail={isShowingDetail}
    >
      <List.Section key="recent-projects" title="Recently Visited Projects">
        {
          /**
           * Update visited projects with newly fetched project data from the api but do not block UI
           * if the request is still processing
           */
          projects
            ? visitedProjects
                ?.filter((visitedProject) => {
                  const isProjectFound = projects.find((project) => project.id === visitedProject.id);
                  // Project might be deleted/archived or user has no longer access to visited project
                  if (!isProjectFound) {
                    removeProjectFromVisit(visitedProject);
                  }
                  return isProjectFound;
                })
                .map((visitedProject) => (
                  <ProjectListItem
                    key={`${visitedProject.id}-recent-project`}
                    removeFromVisits={removeProjectFromVisit}
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    project={projects.find((project) => project.id === visitedProject.id)!}
                    onVisit={visitProject}
                    onLeave={leaveProject}
                  />
                ))
            : visitedProjects?.map((visitedProject) => (
                <ProjectListItem
                  key={`${visitedProject.id}-recent-project`}
                  removeFromVisits={removeProjectFromVisit}
                  project={visitedProject}
                  onVisit={visitProject}
                  onLeave={leaveProject}
                />
              ))
        }
      </List.Section>
      <List.Section key="other-projects" title="Other Projects">
        {projects
          ?.filter((project) => {
            return !visitedProjects?.find((vp) => vp.id === project.id);
          })
          .sort((a, b) => {
            // Show latest updated projects on the top
            return b.updated - a.updated;
          })
          .map((project) => (
            <ProjectListItem
              key={`${project.id}-project`}
              project={project}
              onVisit={visitProject}
              onLeave={leaveProject}
            />
          ))}
      </List.Section>
    </List>
  );
}
