import { MenuBarExtra, Image, Icon, getPreferenceValues, openExtensionPreferences, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ProjectWithServices } from "./type";
import { getProjects, getServices } from "./utils/zeabur-graphql";

async function fetchProjectsWithServices(): Promise<ProjectWithServices[]> {
  const projects = await getProjects();

  return Promise.all(
    projects
      .filter((project) => project.environments?.length > 0)
      .map(async (project) => ({
        project,
        services: await getServices(project._id, project.environments[0]._id),
      })),
  );
}

export default function Command() {
  const preferences = getPreferenceValues();
  const zeaburToken = preferences.zeaburToken;
  const hasToken = zeaburToken !== undefined && zeaburToken !== "";

  const { data: projectsWithServices, isLoading } = useCachedPromise(fetchProjectsWithServices, [], {
    execute: hasToken,
    keepPreviousData: true,
  });

  return (
    <MenuBarExtra icon="extension-icon.png" tooltip="Your Zeabur Projects">
      <MenuBarExtra.Item
        title="Open Dashboard"
        icon="extension-icon.png"
        onAction={() => open("https://zeabur.com/projects")}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Section title="Projects">
        {!hasToken ? (
          <MenuBarExtra.Item
            title="Zeabur Token is not set. Click here to set it."
            onAction={openExtensionPreferences}
          />
        ) : isLoading && !projectsWithServices ? (
          <MenuBarExtra.Item title="Data loading..." icon={Icon.CircleProgress} />
        ) : !projectsWithServices || projectsWithServices.length === 0 ? (
          <MenuBarExtra.Item title="No projects found" />
        ) : (
          projectsWithServices.map(({ project, services }) => (
            <MenuBarExtra.Submenu
              key={project._id}
              title={project.name}
              icon={{
                source: project.iconURL === "" ? "extension-icon.png" : project.iconURL,
                fallback: "extension-icon.png",
                mask: Image.Mask.RoundedRectangle,
              }}
            >
              <MenuBarExtra.Item
                title="Open Project"
                icon={Icon.Globe}
                onAction={() => open(`https://zeabur.com/projects/${project._id}`)}
              />
              <MenuBarExtra.Separator />
              <MenuBarExtra.Section title="Services">
                {services.length > 0 ? (
                  services.map((service) => (
                    <MenuBarExtra.Item
                      key={service._id}
                      title={service.name}
                      icon={{
                        source: service.spec && service.spec.icon ? service.spec.icon : "extension-icon.png",
                        fallback: "extension-icon.png",
                        mask: Image.Mask.RoundedRectangle,
                      }}
                      onAction={() =>
                        open(
                          `https://zeabur.com/projects/${project._id}/services/${service._id}?envID=${project.environments[0]._id}`,
                        )
                      }
                    />
                  ))
                ) : (
                  <MenuBarExtra.Item title="No services" />
                )}
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ))
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
