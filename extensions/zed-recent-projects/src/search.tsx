import { ComponentType, createContext, useContext, useEffect, useState } from "react";
import { List, Action, Application, getApplications, Detail } from "@raycast/api";
import { existsSync } from "fs";
import { URL } from "url";
import { getEntry } from "./lib/entry";
import { ZED_BUNDLE_ID } from "./lib/zed";
import { useZedEntries } from "./hooks/useZedEntries";
import { EntryItem } from "./components/EntryItem";

const ZedContext = createContext<{
  zed?: Application;
}>({
  zed: undefined,
});

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const [zed, setZed] = useState<Application>();
    const [isLoading, setIsloading] = useState(true);

    useEffect(() => {
      getApplications()
        .then((apps) => {
          const zedApp = apps.find((a) => a.bundleId === ZED_BUNDLE_ID);
          if (zedApp) {
            setZed(zedApp);
          }
        })
        .finally(() => setIsloading(false));
    }, []);

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
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const zed = useContext(ZedContext).zed!;
  const { entries, setEntry } = useZedEntries();

  return (
    <List>
      {Object.values(entries)
        .filter((e) => existsSync(new URL(e.uri)))
        .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
        .map((e) => {
          const entry = getEntry(e.uri);
          return (
            <EntryItem key={entry.uri} entry={entry} icon={entry.path && { fileIcon: entry.path }}>
              <Action.Open
                title="Open in Zed"
                onOpen={() => setEntry(entry.uri, true)}
                target={entry.path}
                application={zed}
                icon={{ fileIcon: zed.path }}
              />
              <Action.ShowInFinder path={entry.path} />
            </EntryItem>
          );
        })}
    </List>
  );
}

export default withZed(Command);
