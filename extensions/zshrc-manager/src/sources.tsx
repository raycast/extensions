import { Icon, List } from "@raycast/api";
import { parseSources } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Source item interface
 */
interface SourceItem extends FilterableItem {
  path: string;
}

/**
 * Sources management command for zshrc content
 */
export default function Sources() {
  return (
    <ListViewController<SourceItem>
      commandName="Sources"
      navigationTitle="Sources"
      searchPlaceholder="Search source commands..."
      icon={Icon.Document}
      tintColor={MODERN_COLORS.primary}
      itemType="source"
      itemTypePlural="sources"
      parser={parseSources}
      searchFields={["path", "section"]}
      generateTitle={(source) => truncateValueMiddle(source.path)}
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
      generateItemMarkdown={(source) => `
# Source: \`${source.path}\`

## 📄 Source Command
\`\`\`zsh
source ${source.path}
\`\`\`

## 📍 Location
- **Section**: ${source.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${source.sectionStartLine}

## 💡 Source Types
- **Theme Files**: Zsh theme configurations
- **Completion Scripts**: Tab completion enhancements
- **External Scripts**: Custom zsh configurations
- **Plugin Files**: Plugin-specific configurations
- **Utility Scripts**: Helper functions and aliases

## 🔍 File Analysis
- **Path**: ${source.path}
- **Type**: ${source.path.includes("theme") ? "Theme" : source.path.includes("completion") ? "Completion" : "Configuration"}
- **Framework**: ${source.path.includes("oh-my-zsh") ? "Oh My Zsh" : "Custom"}

## ⚠️ Note
Source commands load external files. Make sure the referenced files exist and are accessible.
      `}
      generateMetadata={(source) => (
        <>
          <List.Item.Detail.Metadata.Label
            title="Source Path"
            text={truncateValueMiddle(source.path, 60)}
            icon={{
              source: Icon.Document,
              tintColor: MODERN_COLORS.primary,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={source.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="File"
            text="~/.zshrc"
            icon={{
              source: Icon.Document,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={
              source.path.includes("theme")
                ? "Theme"
                : source.path.includes("completion")
                  ? "Completion"
                  : "Configuration"
            }
            icon={{
              source: Icon.Gear,
              tintColor: MODERN_COLORS.warning,
            }}
          />
        </>
      )}
    />
  );
}
