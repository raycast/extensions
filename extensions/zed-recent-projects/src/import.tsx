import { useState, ComponentType, useEffect, createContext, useContext, useMemo } from "react";
import { List, Action, Icon, getApplications, Detail } from "@raycast/api";
import { useVsCodeEntries, VSCodeApplication, VSCodeBundleId } from "./hooks/useVsCodeEntries";
import { useZedEntries } from "./hooks/useZedEntries";
import { EntryItem } from "./components/EntryItem";

const CodeAppsContext = createContext<{
  apps: VSCodeApplication[];
  appsDict: Partial<Record<VSCodeBundleId, VSCodeApplication>>;
}>({
  apps: [],
  appsDict: {},
});

export const withCodeApps = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const [apps, setApps] = useState<VSCodeApplication[]>([]);
    const appsDict = useMemo(
      () =>
        apps.reduce(
          (acc, a) => ({
            ...acc,
            [a.bundleId]: a,
          }),
          {}
        ),
      [apps]
    );
    const [isLoading, setIsloading] = useState(true);

    useEffect(() => {
      getApplications()
        .then((result) => {
          const codeApps = result.filter(
            ({ bundleId }) =>
              bundleId && ["com.microsoft.VSCode", "com.microsoft.VSCodeInsiders", "com.vscodium"].includes(bundleId)
          ) as VSCodeApplication[];

          setApps(codeApps);
        })
        .finally(() => setIsloading(false));
    }, []);

    if (apps.length === 0) {
      return <Detail isLoading={isLoading} markdown={isLoading ? "" : `No VS Code apps detected`} />;
    }

    return (
      <CodeAppsContext.Provider value={{ apps, appsDict }}>
        <Component {...props} />
      </CodeAppsContext.Provider>
    );
  };
};

export function Command() {
  const { apps, appsDict } = useContext(CodeAppsContext);
  const [bundleId, setBundleId] = useState<VSCodeBundleId>(apps[0].bundleId);
  const { entries, setEntry, setEntries, removeEntry } = useZedEntries();
  const { entries: vsCodeEntries, isLoading } = useVsCodeEntries(bundleId);

  const notImported = vsCodeEntries.filter((e) => !entries[e.uri]);

  const importAll = () => setEntries(notImported.map((e) => e.uri));

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="VS Code App" value={bundleId} onChange={(v) => setBundleId(v as VSCodeBundleId)}>
          {apps.map((app) => (
            <List.Dropdown.Item
              key={app.bundleId}
              icon={{ fileIcon: app.path }}
              value={app.bundleId}
              title={app.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Imported">
        {vsCodeEntries
          .filter((e) => !!entries[e.uri])
          .map((entry) => {
            return (
              <EntryItem key={entry.uri} entry={entry} icon={{ fileIcon: entry.path }} accessoryIcon={Icon.CheckCircle}>
                <Action title="Remove" onAction={() => removeEntry(entry.uri)} />
                <Action title="Import All" onAction={importAll} />
              </EntryItem>
            );
          })}
      </List.Section>

      <List.Section title={`${appsDict[bundleId]?.name} Recent Projects`}>
        {notImported.map((entry) => {
          return (
            <EntryItem key={entry.uri} entry={entry} icon={{ fileIcon: entry.path }} accessoryIcon={Icon.Circle}>
              <Action title="Import" onAction={() => setEntry(entry.uri)} />
              <Action title="Import All" onAction={importAll} />
            </EntryItem>
          );
        })}
      </List.Section>
    </List>
  );
}

export default withCodeApps(Command);
