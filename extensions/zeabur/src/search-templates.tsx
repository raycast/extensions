import { List, ActionPanel, Action, Icon } from "@raycast/api";
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
          accessories={[
            { tag: { value: (template.services?.length ?? 0).toString() + " services" }, tooltip: "Service Count" },
            {
              tag: { value: (template.deploymentCnt ?? 0).toString() },
              icon: Icon.Download,
              tooltip: "Deployment Count",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Deploy Template"
                url={`https://zeabur.com/templates/${template.code}/deploy`}
                icon={Icon.Rocket}
              />
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
