import { ActionPanel, Action, List } from "@raycast/api";
import { docs } from "./docs";
import { flattenDocs } from "./utils/flatten-docs";

export default function Command() {
  return (
    <List>
      {flattenDocs(docs).map((item) => (
        <List.Item
          key={item.id}
          icon={{ source: "zod-logo.svg" }}
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
