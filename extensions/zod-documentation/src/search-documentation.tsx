import { Action, ActionPanel, List } from "@raycast/api";
import { useAtom } from "jotai";
import { zodVersionAtom } from "./atoms";
import { flattenV3Docs, flattenV4Docs } from "./flatten-docs";

const zodVersions = [
  { id: "4", name: "Zod 4", icon: { source: "zod-4-logo.png" } },
  { id: "3", name: "Zod 3", icon: { source: "zod-3-logo.png" } },
] as const;

function ZodVersionDropdown(props: { onZodVersionChange: (newValue: string) => void }) {
  const { onZodVersionChange } = props;

  return (
    <List.Dropdown tooltip="Select Zod Version" storeValue={true} onChange={(newValue) => onZodVersionChange(newValue)}>
      {zodVersions.map((version) => (
        <List.Dropdown.Item key={version.id} title={version.name} value={version.id} icon={version.icon} />
      ))}
    </List.Dropdown>
  );
}

export type ZodVersion = (typeof zodVersions)[number]["id"];

export default function Command() {
  const [zodVersion, setZodVersion] = useAtom(zodVersionAtom);

  return (
    <List
      searchBarAccessory={
        <ZodVersionDropdown onZodVersionChange={(newValue) => setZodVersion(newValue as ZodVersion)} />
      }
    >
      {(zodVersion === "4" ? flattenV4Docs() : flattenV3Docs()).map((item) => (
        <List.Item
          key={item.id}
          icon={{ source: zodVersion === "4" ? "zod-4-logo.png" : "zod-3-logo.png" }}
          title={item.subtitle ? `${item.title} | ${item.subtitle}` : item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard content={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
