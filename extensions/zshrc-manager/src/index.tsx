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

/**
 * View types available in the unified command
 */
type ViewType =
  | "statistics"
  | "sections"
  | "aliases"
  | "exports"
  | "functions"
  | "plugins"
  | "sources"
  | "evals"
  | "setopts";

/**
 * Unified command for managing zshrc configuration
 *
 * Provides a single command with a dropdown to switch between different views:
 * - Statistics: Overview of all configuration
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
      <List.Dropdown.Item title="Statistics" value="statistics" />
      <List.Dropdown.Item title="Sections" value="sections" />
      <List.Dropdown.Item title="Aliases" value="aliases" />
      <List.Dropdown.Item title="Exports" value="exports" />
      <List.Dropdown.Item title="Functions" value="functions" />
      <List.Dropdown.Item title="Plugins" value="plugins" />
      <List.Dropdown.Item title="Sources" value="sources" />
      <List.Dropdown.Item title="Evals" value="evals" />
      <List.Dropdown.Item title="Setopts" value="setopts" />
    </List.Dropdown>
  );

  switch (selectedView) {
    case "statistics":
      return <ZshrcStatistics />;
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
    default:
      return <ZshrcStatistics />;
  }
}
