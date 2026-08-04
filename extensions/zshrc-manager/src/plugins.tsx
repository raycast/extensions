import { Color, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parsePlugins } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem, type ItemWarning } from "./lib/list-view-controller";
import { pluginInstalled } from "./lib/resolve";

/**
 * Plugin item interface
 */
interface PluginItem extends FilterableItem {
  name: string;
}

interface PluginsProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Warning generator for plugins
 * Flags listed plugins missing from the Oh My Zsh plugins directories
 * (unknown — no OMZ installation — stays silent)
 */
export function generatePluginWarning(plugin: PluginItem): ItemWarning | null {
  if (pluginInstalled(plugin.name) === "no") {
    return {
      type: "broken",
      message: "Plugin not installed",
      icon: Icon.ExclamationMark,
      color: Color.Red,
    };
  }
  return null;
}

/**
 * Plugins management command for zshrc content
 */
export default function Plugins({ searchBarAccessory }: PluginsProps) {
  return (
    <ListViewController<PluginItem>
      commandName="Plugins"
      navigationTitle="Plugins"
      searchPlaceholder="Search Plugins..."
      icon={Icon.Plug}
      tintColor={MODERN_COLORS.warning}
      itemType="plugin"
      itemTypePlural="plugins"
      parser={parsePlugins}
      searchFields={["name", "section"]}
      searchBarAccessory={searchBarAccessory}
      warningGenerator={generatePluginWarning}
      showWarningFilter={!searchBarAccessory}
      generateTitle={(plugin) => plugin.name}
      postProcessItems={(items) => {
        // Get unique plugins (since they might appear in multiple sections)
        const uniquePlugins = Array.from(new Set(items.map((p) => p.name)));
        return items.filter((item) => uniquePlugins.includes(item.name));
      }}
      generateOverviewMarkdown={(_, allPlugins, grouped) => {
        const uniquePlugins = Array.from(new Set(allPlugins.map((p) => p.name)));
        return `
# Plugin Summary

Your \`.zshrc\` file contains **${uniquePlugins.length} unique plugins** across **${allPlugins.length > 0 ? Object.keys(grouped).length : 0} sections**.

## 🔌 What are Plugins?
Plugins extend zsh functionality with additional features and commands. They're typically loaded through frameworks like Oh My Zsh, Zinit, or Antigen.

## 📊 Quick Stats
- **Unique Plugins**: ${uniquePlugins.length}
- **Total Plugin Entries**: ${allPlugins.length}
- **Sections with Plugins**: ${Object.keys(grouped).length}

## 💡 Common Plugins
- **git**: Git aliases and functions
- **docker**: Docker completion and aliases
- **node**: Node.js and npm utilities
- **python**: Python development tools
- **zsh-autosuggestions**: Command suggestions
- **zsh-syntax-highlighting**: Syntax highlighting

## ⚠️ Performance Note
Too many plugins can slow down shell startup. Consider using lazy loading or removing unused plugins.
        `;
      }}
      generateItemMarkdown={(plugin) => `
# Plugin: \`${plugin.name}\`

## 🔌 Plugin Configuration
\`\`\`zsh
plugins=(${plugin.name} ...)
\`\`\`

## 📍 Location
- **Section**: ${plugin.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${plugin.sectionStartLine}

## 💡 Plugin Information
- **Name**: ${plugin.name}
- **Type**: Zsh Plugin
- **Framework**: Oh My Zsh, Zinit, or Antigen

## 🔍 Common Plugin Features
- **Aliases**: Shortcuts for common commands
- **Functions**: Custom shell functions
- **Completions**: Tab completion enhancements
- **Themes**: Prompt customization
- **Utilities**: Development tools and helpers

## ⚠️ Note
Plugin functionality depends on your zsh plugin manager. Use the "Open ~/.Zshrc" action to view the complete plugin configuration.
      `}
      generateMetadata={(plugin) => {
        const installed = pluginInstalled(plugin.name);
        return (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Plugin Name"
              text={plugin.name}
              icon={{
                source: Icon.Plug,
                tintColor: MODERN_COLORS.warning,
              }}
            />
            <List.Item.Detail.Metadata.Label
              title="Installed"
              text={installed === "yes" ? "Installed" : installed === "no" ? "Not Found" : "Unknown"}
              icon={
                installed === "yes"
                  ? { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }
                  : installed === "no"
                    ? { source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error }
                    : { source: Icon.QuestionMarkCircle, tintColor: MODERN_COLORS.neutral }
              }
            />
            <List.Item.Detail.Metadata.Label
              title="Section"
              text={plugin.section}
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
              text="Zsh Plugin"
              icon={{
                source: Icon.Gear,
                tintColor: MODERN_COLORS.success,
              }}
            />
          </List.Item.Detail.Metadata>
        );
      }}
    />
  );
}
