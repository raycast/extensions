import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { TemplateInfo } from "./type";
import { getTemplates } from "./utils/zeabur-graphql";

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const templates = await getTemplates();

    return { templates };
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search templates">
      {data?.templates.map((template: TemplateInfo) => (
        <List.Item
          key={template.code}
          title={template.name}
          subtitle={template.description}
          icon={{ source: template.iconURL ?? "extension-icon.png", fallback: "extension-icon.png" }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://zeabur.com/templates/${template.code}`} />
              <Action.CopyToClipboard
                title="Copy Template URL"
                content={`https://zeabur.com/templates/${template.code}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
