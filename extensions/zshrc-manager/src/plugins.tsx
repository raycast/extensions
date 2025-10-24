import { Icon, List } from "@raycast/api";
import { parsePlugins } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Plugin item interface
 */
interface PluginItem extends FilterableItem {
  name: string;
}

/**
 * Plugins management command for zshrc content
 */
export default function Plugins() {
  return (
    <ListViewController<PluginItem>
      commandName="Plugins"
      navigationTitle="Plugins"
      searchPlaceholder="Search plugins..."
      icon={Icon.Box}
      tintColor={MODERN_COLORS.warning}
      itemType="plugin"
      itemTypePlural="plugins"
      parser={parsePlugins}
      searchFields={["name", "section"]}
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
      generateMetadata={(plugin) => (
        <>
          <List.Item.Detail.Metadata.Label
            title="Plugin Name"
            text={plugin.name}
            icon={{
              source: Icon.Box,
              tintColor: MODERN_COLORS.warning,
            }}
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
        </>
      )}
    />
  );
}
