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
import { readdirSync } from "fs";
import { createContext, ComponentType, useContext } from "react";
import { zedBuild } from "./lib/preferences";

const preferences = getPreferenceValues<Preferences.OpenFromProjectsFolder>();

const dir = preferences.projectsdir;

const ZedContext = createContext<{
  zed?: Application;
}>({
  zed: undefined,
});

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const { data: zed, isLoading } = usePromise(async () =>
      (await getApplications()).find((a) => a.bundleId === getZedBundleId(zedBuild)),
    );

    if (!zed) {
      return <Detail isLoading={isLoading} markdown={isLoading ? "" : `No Zed app detected`} />;
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
  const zedIcon = zed ? { fileIcon: zed?.path } : undefined;
  return (
    <List isLoading={false}>
      {readdirSync(dir, { withFileTypes: true }).map(function (item) {
        try {
          return item.name.charAt(0) !== "." && item.name.charAt(0) !== ".." && item.isDirectory() ? (
            <List.Item
              key={item.name}
              icon={{ fileIcon: `${item.parentPath}/${item.name}` }}
              title={item.name}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open in Zed"
                    target={`${item.parentPath}/${item.name}`}
                    application={zed}
                    icon={zedIcon}
                  />
                </ActionPanel>
              }
            />
          ) : null;
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error While Listing Directories",
            message: `${error instanceof Error ? error.message : String(error)}`,
          });
        }
      })}
    </List>
  );
}

export default withZed(Command);
