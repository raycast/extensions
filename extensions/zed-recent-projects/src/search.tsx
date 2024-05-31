import { ComponentType, createContext, useContext, useEffect, useState } from "react";
import { List, Action, Application, getApplications, getPreferenceValues, Detail, Icon } from "@raycast/api";
import { existsSync } from "fs";
import { URL } from "url";
import { getEntry } from "./lib/entry";
import { getZedBundleId, ZedBuild } from "./lib/zed";
import { useZedRecentWorkspaces } from "./lib/zedEntries";
import { usePinnedEntries } from "./hooks/usePinnedEntries";
import { EntryItem } from "./components/EntryItem";

const preferences: Record<string, string> = getPreferenceValues();
const zedBuild: ZedBuild = preferences.build as ZedBuild;

const ZedContext = createContext<{
  zed?: Application;
}>({
  zed: undefined,
});

function exists(p: string) {
  try {
    return existsSync(new URL(p));
  } catch {
    return false;
  }
}

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const [zed, setZed] = useState<Application>();
    const [isLoading, setIsloading] = useState(true);

    useEffect(() => {
      getApplications()
        .then((apps) => {
          const zedApp = apps.find((a) => a.bundleId === getZedBundleId(zedBuild));
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
  const { entries, isLoading, error } = useZedRecentWorkspaces();
  const { pinnedEntries, pinEntry, unpinEntry, moveUp, moveDown } = usePinnedEntries();

  const pinned = Object.values(pinnedEntries)
    .filter((e) => exists(e.uri))
    .sort((a, b) => a.order - b.order);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No Recent Projects"
        description={error ? "Check that Zed is up-to-date" : undefined}
        icon="no-view.png"
      />
      <List.Section title="Pinned Projects">
        {pinned.map((e) => {
          const entry = getEntry(e.uri);

          if (!entry) {
            return null;
          }

          return (
            <EntryItem key={entry.uri} entry={entry} icon={entry.path && { fileIcon: entry.path }}>
              <Action.Open title="Open in Zed" target={entry.path} application={zed} icon={{ fileIcon: zed.path }} />
              <Action.ShowInFinder path={entry.path} />
              <Action
                title="Unpin Entry"
                icon={Icon.PinDisabled}
                onAction={() => unpinEntry(e)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              {e.order > 0 ? (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  onAction={() => moveUp(e)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                />
              ) : null}
              {e.order < pinned.length - 1 ? (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  onAction={() => moveDown(e)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                />
              ) : null}
            </EntryItem>
          );
        })}
      </List.Section>

      <List.Section title="Recent Projects">
        {Object.values(entries)
          .filter((e) => !pinnedEntries[e.uri] && exists(e.uri))
          .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
          .map((e) => {
            const entry = getEntry(e.uri);

            if (!entry) {
              return null;
            }

            return (
              <EntryItem key={entry.uri} entry={entry} icon={entry.path && { fileIcon: entry.path }}>
                <Action.Open title="Open in Zed" target={entry.path} application={zed} icon={{ fileIcon: zed.path }} />
                <Action.ShowInFinder path={entry.path} />
                <Action
                  title="Pin Entry"
                  icon={Icon.Pin}
                  onAction={() => pinEntry(e)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
              </EntryItem>
            );
          })}
      </List.Section>
    </List>
  );
}

export default withZed(Command);
