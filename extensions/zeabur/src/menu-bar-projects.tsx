import { useState, useEffect } from "react";
import { MenuBarExtra, Image, Icon, getPreferenceValues, openExtensionPreferences, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ProjectInfo, ServiceInfo } from "./type";
import { getProjects, getServices } from "./utils/zeabur-graphql";

export default function Command() {
  const preferences = getPreferenceValues();
  const zeaburToken = preferences.zeaburToken;

  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [projectServices, setProjectServices] = useState<Record<string, ServiceInfo[]>>({});

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projects = await getProjects();
        setProjects(projects);

        const servicesMap: Record<string, ServiceInfo[]> = {};
        await Promise.all(
          projects.map(async (project) => {
            servicesMap[project._id] = await getServices(project._id, project.environments[0]._id);
          }),
        );
        setProjectServices(servicesMap);

        setIsLoading(false);
      } catch {
        showFailureToast("Failed to fetch projects");
        setIsLoading(false);
      }
    };

    if (zeaburToken !== undefined && zeaburToken !== "") {
      fetchProjects();
    } else {
      setIsLoading(false);
    }
  }, [zeaburToken]);

  return (
    <MenuBarExtra icon="extension-icon.png" tooltip="Your Zeabur Projects">
      <MenuBarExtra.Item
        title="Open Dashboard"
        icon="extension-icon.png"
        onAction={() => open("https://zeabur.com/projects")}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Section title="Projects">
        {zeaburToken == undefined || zeaburToken == "" ? (
          <MenuBarExtra.Item
            title="Zeabur Token is not set. Click here to set it."
            onAction={openExtensionPreferences}
          />
        ) : (
          projects.map((project) => (
            <MenuBarExtra.Submenu
              key={project._id}
              title={project.name}
              icon={{
                source: project.iconURL == "" ? "extension-icon.png" : project.iconURL,
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
                {projectServices[project._id] && projectServices[project._id].length > 0
                  ? projectServices[project._id].map((service) => (
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
                  : !isLoading && <MenuBarExtra.Item title="No services" />}
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ))
        )}
        {isLoading && <MenuBarExtra.Item title="Data loading..." icon={Icon.CircleProgress} />}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
