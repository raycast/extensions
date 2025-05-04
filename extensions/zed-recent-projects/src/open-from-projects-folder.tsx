import {
  List,
  Action,
  Application,
  getPreferenceValues,
  getApplications,
  Detail,
  ActionPanel,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getZedBundleId } from "./lib/zed";
import { promises as fs } from "fs";
import { join } from "path";
import { createContext, ComponentType, useContext, useState, useEffect } from "react";
import { zedBuild } from "./lib/preferences";

const preferences = getPreferenceValues<Preferences.OpenFromProjectsFolder>();

const dir = preferences.projectsdir;

interface ZedContextType {
  zed?: Application;
}

const ZedContext = createContext<ZedContextType>({
  zed: undefined,
});

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const { data: zed, isLoading } = usePromise(async () =>
      (await getApplications()).find((a) => a.bundleId === getZedBundleId(zedBuild)),
    );

    if (!zed) {
      return (
        <Detail
          isLoading={isLoading}
          markdown={isLoading ? "Loading Zed..." : "No Zed application detected. Please ensure Zed is installed."}
        />
      );
    }

    return (
      <ZedContext.Provider value={{ zed }}>
        <Component {...props} />
      </ZedContext.Provider>
    );
  };
};

export function Command() {
  const { zed } = useContext(ZedContext);
  const zedIcon = zed ? { fileIcon: zed.path } : undefined;
  const [projects, setProjects] = useState<Array<{ name: string; path: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const dirEntries = await fs.readdir(dir, { withFileTypes: true });
        const projectList = dirEntries
          .filter((item) => item.isDirectory() && !item.name.startsWith("."))
          .map((item) => ({
            name: item.name,
            path: join(dir, item.name),
          }));
        setProjects(projectList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error Fetching Directories",
          message: `${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.map((project) => (
        <List.Item
          key={project.name}
          icon={{ fileIcon: project.path }}
          title={project.name}
          actions={
            <ActionPanel>
              <Action.Open title="Open in Zed" target={project.path} application={zed} icon={zedIcon} />
              <Action.ShowInFinder path={project.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withZed(Command);
