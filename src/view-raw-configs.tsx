import { ActionPanel, Action, Icon, Grid } from "@raycast/api";
import { EditorType } from "./types/mcpServer";
import { getEditorConfig, EDITOR_CONFIGS } from "./utils/constants";
import { RawConfigEditor } from "./components/RawConfigEditor";

const cursorIcon = "../assets/cursor-icon.png";
const windsurfIcon = "../assets/windsurf-icon.png";
const vscodeIcon = "../assets/vscode-icon.png";

export default function Command() {
  const editors: EditorType[] = ["cursor", "windsurf", "vscode"];

  return (
    <Grid
      columns={3}
      fit={Grid.Fit.Fill}
      aspectRatio="3/2"
      navigationTitle="View Raw MCP Configurations"
      searchBarPlaceholder="Search editors..."
    >
      {editors.map((editorType) => {
        const config = getEditorConfig(editorType);
        return (
          <Grid.Item
            key={editorType}
            content={{
              source: getEditorIcon(editorType),
              fallback: Icon.Gear,
            }}
            title={config.displayName}
            subtitle={config.description}
            accessory={{
              icon: Icon.Network,
              tooltip: `Supports ${config.supportedTransports.length} transport types: ${config.supportedTransports.join(", ")}`,
            }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title={`View ${config.displayName} Config`}
                    icon={Icon.Document}
                    target={<RawConfigEditor editorType={editorType} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Config Path"
                    content={getConfigPathForDisplay(editorType)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

function getEditorIcon(editorType: EditorType): string {
  switch (editorType) {
    case "cursor":
      return cursorIcon;
    case "windsurf":
      return windsurfIcon;
    case "vscode":
      return vscodeIcon;
    default:
      return "⚙️";
  }
}

function getConfigPathForDisplay(editorType: EditorType): string {
  const config = EDITOR_CONFIGS[editorType];

  if (editorType === "vscode") {
    const paths = [];
    if (config.configPaths.workspace) {
      paths.push(`.vscode/mcp.json`);
    }
    if (config.configPaths.user) {
      paths.push(config.configPaths.user);
    }
    return paths.join(" | ");
  }

  return config.configPaths.global || "No config path";
}
