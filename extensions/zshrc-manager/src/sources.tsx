import { Color, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseSources } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem, type ItemWarning } from "./lib/list-view-controller";
import { sourceFileExists } from "./lib/resolve";

/**
 * Source item interface
 */
interface SourceItem extends FilterableItem {
  path: string;
}

interface SourcesProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Warning generator for sources
 * Flags source lines whose file does not exist (unknown stays silent)
 */
export function generateSourceWarning(source: SourceItem): ItemWarning | null {
  if (sourceFileExists(source.path) === "no") {
    return {
      type: "broken",
      message: "Source file missing",
      icon: Icon.ExclamationMark,
      color: Color.Red,
    };
  }
  return null;
}

/**
 * Sources management command for zshrc content
 */
export default function Sources({ searchBarAccessory }: SourcesProps) {
  return (
    <ListViewController<SourceItem>
      commandName="Sources"
      navigationTitle="Sources"
      searchPlaceholder="Search Source Commands..."
      icon={Icon.Document}
      tintColor={MODERN_COLORS.primary}
      itemType="source"
      itemTypePlural="sources"
      parser={parseSources}
      searchFields={["path", "section"]}
      searchBarAccessory={searchBarAccessory}
      warningGenerator={generateSourceWarning}
      showWarningFilter={!searchBarAccessory}
      generateTitle={(source) => truncateValueMiddle(source.path)}
      getItemName={(source) => source.path}
      getItemValue={(source) => source.path}
      generateOverviewMarkdown={(_, allSources, grouped) => `
# Source Summary

Your \`.zshrc\` file contains **${allSources.length} source commands** across **${allSources.length > 0 ? Object.keys(grouped).length : 0} sections**.

## 📄 What are Source Commands?
Source commands load additional configuration files into your shell session. They're used to include external scripts, themes, completions, and other zsh configurations.

## 📊 Quick Stats
- **Total Sources**: ${allSources.length}
- **Sections with Sources**: ${Object.keys(grouped).length}
- **Common Types**: Themes, completions, external scripts

## 💡 Common Source Files
- **Themes**: \`~/.oh-my-zsh/themes/theme-name.zsh-theme\`
- **Completions**: \`/path/to/completion.zsh\`
- **External Scripts**: \`~/.config/zsh/custom.zsh\`
- **Plugin Files**: \`~/.oh-my-zsh/plugins/plugin/plugin.plugin.zsh\`

## ⚠️ Performance Note
Too many source commands can slow down shell startup. Consider using conditional sourcing or lazy loading.
      `}
      omitValueMarkdown={true}
      generateMetadata={(source) => {
        const exists = sourceFileExists(source.path);
        return (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Source Path"
              text={truncateValueMiddle(source.path, 60)}
              icon={{ source: Icon.Document, tintColor: MODERN_COLORS.primary }}
            />
            <List.Item.Detail.Metadata.Label
              title="Source Exists"
              text={exists === "yes" ? "Yes" : exists === "no" ? "Missing" : "Unknown"}
              icon={
                exists === "yes"
                  ? { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }
                  : exists === "no"
                    ? { source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error }
                    : { source: Icon.QuestionMarkCircle, tintColor: MODERN_COLORS.neutral }
              }
            />
            <List.Item.Detail.Metadata.Label
              title="Section"
              text={source.section}
              icon={{
                source: Icon.Folder,
                tintColor: MODERN_COLORS.neutral,
              }}
            />
            <List.Item.Detail.Metadata.Label title="Section Starts" text={`Line ${source.sectionStartLine}`} />
            <List.Item.Detail.Metadata.Label title="File" text="~/.zshrc" icon={Icon.Document} />
            <List.Item.Detail.Metadata.Label
              title="Type"
              text={
                source.path.includes("theme")
                  ? "Theme"
                  : source.path.includes("completion")
                    ? "Completion"
                    : "Configuration"
              }
              icon={{ source: Icon.Gear, tintColor: MODERN_COLORS.warning }}
            />
          </List.Item.Detail.Metadata>
        );
      }}
    />
  );
}
