import { useState } from "react";
import { List } from "@raycast/api";
import ZshrcStatistics from "./zshrc-statistics";
import Sections from "./sections";
import Aliases from "./aliases";
import Exports from "./exports";
import Functions from "./functions";
import Plugins from "./plugins";
import Sources from "./sources";
import Evals from "./evals";
import Setopts from "./setopts";
import PathEntries from "./path-entries";
import FpathEntries from "./fpath-entries";
import Keybindings from "./keybindings";
import HealthCheck from "./health-check";
import BackupManager from "./backup-manager";
import BrowseAliases from "./browse-aliases";

/**
 * View types available in the unified command
 */
type ViewType =
  | "statistics"
  | "health"
  | "backup"
  | "browse-aliases"
  | "sections"
  | "aliases"
  | "exports"
  | "functions"
  | "plugins"
  | "sources"
  | "evals"
  | "setopts"
  | "path"
  | "fpath"
  | "keybindings";

/**
 * Unified command for managing zshrc configuration
 *
 * Provides a single command with a dropdown to switch between different views:
 * - Statistics: Overview of all configuration, with cross-type search built in
 * - Sections: Browse sections
 * - Aliases: Manage aliases
 * - Exports: Manage exports
 * - Functions: View functions
 * - Plugins: View plugins
 * - Sources: View sources
 * - Evals: View evals
 * - Setopts: View setopts
 */
export default function ZshrcManager() {
  const [selectedView, setSelectedView] = useState<ViewType>("statistics");

  const viewDropdown = (
    <List.Dropdown
      tooltip="Select View"
      value={selectedView}
      onChange={(newValue) => setSelectedView(newValue as ViewType)}
    >
      <List.Dropdown.Section title="Overview">
        <List.Dropdown.Item title="📊 Statistics" value="statistics" />
        <List.Dropdown.Item title="🩺 Health Check" value="health" />
        <List.Dropdown.Item title="💾 Backup Manager" value="backup" />
        <List.Dropdown.Item title="📚 Browse Alias Collections" value="browse-aliases" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Browse">
        <List.Dropdown.Item title="📁 Sections" value="sections" />
        <List.Dropdown.Item title="⌨️ Aliases" value="aliases" />
        <List.Dropdown.Item title="📦 Exports" value="exports" />
        <List.Dropdown.Item title="ƒ Functions" value="functions" />
        <List.Dropdown.Item title="🔌 Plugins" value="plugins" />
        <List.Dropdown.Item title="📄 Sources" value="sources" />
        <List.Dropdown.Item title="⚡ Evals" value="evals" />
        <List.Dropdown.Item title="⚙️ Setopts" value="setopts" />
        <List.Dropdown.Item title="🛤️ PATH" value="path" />
        <List.Dropdown.Item title="📂 FPATH" value="fpath" />
        <List.Dropdown.Item title="🎹 Keybindings" value="keybindings" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const renderView = () => {
    switch (selectedView) {
      case "statistics":
        return <ZshrcStatistics searchBarAccessory={viewDropdown} />;
      case "health":
        return <HealthCheck searchBarAccessory={viewDropdown} />;
      case "backup":
        return <BackupManager searchBarAccessory={viewDropdown} />;
      case "browse-aliases":
        return <BrowseAliases searchBarAccessory={viewDropdown} />;
      case "sections":
        return <Sections searchBarAccessory={viewDropdown} />;
      case "aliases":
        return <Aliases searchBarAccessory={viewDropdown} />;
      case "exports":
        return <Exports searchBarAccessory={viewDropdown} />;
      case "functions":
        return <Functions searchBarAccessory={viewDropdown} />;
      case "plugins":
        return <Plugins searchBarAccessory={viewDropdown} />;
      case "sources":
        return <Sources searchBarAccessory={viewDropdown} />;
      case "evals":
        return <Evals searchBarAccessory={viewDropdown} />;
      case "setopts":
        return <Setopts searchBarAccessory={viewDropdown} />;
      case "path":
        return <PathEntries searchBarAccessory={viewDropdown} />;
      case "fpath":
        return <FpathEntries searchBarAccessory={viewDropdown} />;
      case "keybindings":
        return <Keybindings searchBarAccessory={viewDropdown} />;
      default:
        return <ZshrcStatistics />;
    }
  };

  return renderView();
}
