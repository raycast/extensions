/**
 * Shared cross-type search results
 *
 * One implementation of the "search everything" result model and its list
 * item, used by both Global Search and the Statistics view so the two
 * surfaces cannot drift apart in actions or secret handling again.
 */

import { List, Icon, Color, ActionPanel } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import type { LogicalSection } from "./parse-zshrc";
import { truncateValueMiddle } from "../utils/formatters";
import { shellQuoteSingle, stripSurroundingQuotes } from "../utils/shell-escape";
import { isSecretName, maskValue } from "../utils/secrets";
import {
  parseAliases,
  parseExports,
  parseFunctions,
  parsePlugins,
  parseSources,
  parseEvals,
  parseSetopts,
} from "../utils/parsers";
import { SharedActionsSection } from "./shared-actions";
import { deleteItem } from "./delete-item";
import EditAlias, { aliasConfig } from "../edit-alias";
import EditExport, { exportConfig } from "../edit-export";

/**
 * Unified search result item
 */
export interface SearchResult {
  id: string;
  type: "alias" | "export" | "function" | "plugin" | "source" | "eval" | "setopt";
  title: string;
  subtitle: string;
  keywords: string[];
  icon: { source: Icon; tintColor: string };
  /** Full definition line for Copy Definition */
  copyValue: string;
  /** Item name for Copy Name */
  name: string;
  /** Item value for Copy Value — always the real, unmasked value */
  value: string;
  /** Raw right-hand side as written in the file (exports keep their quotes); used to round-trip edits */
  rawValue: string;
  /** Label of the logical section the item was parsed from */
  section: string;
  /** 0-based instance of the section label (labels are not unique) */
  sectionOccurrence: number;
  /** Whether the value should be masked in the list */
  isSecret: boolean;
}

/**
 * Converts logical sections to searchable results, preserving each item's
 * section label so edits from search stay in the right section
 */
export function createSearchResults(sections: readonly LogicalSection[]): SearchResult[] {
  const results: SearchResult[] = [];
  // Identity-based ids: reveal state is keyed by id, so ids must stay with
  // their item when the file is edited and results shift position. A counter
  // disambiguates genuine duplicates (same name, same section).
  const seen = new Map<string, number>();
  const labelInstances = new Map<string, number>();
  let currentSectionOccurrence = 0;
  const makeIdentity = (type: string, section: string, name: string): { id: string; sectionOccurrence: number } => {
    const idBase = `${type}:${section}:${name}`;
    const idCount = seen.get(idBase) ?? 0;
    seen.set(idBase, idCount + 1);
    return {
      id: idCount === 0 ? idBase : `${idBase}:${idCount}`,
      sectionOccurrence: currentSectionOccurrence,
    };
  };

  sections.forEach((section) => {
    currentSectionOccurrence = labelInstances.get(section.label) ?? 0;
    labelInstances.set(section.label, currentSectionOccurrence + 1);
    parseAliases(section.content).forEach((alias) => {
      results.push({
        ...makeIdentity("alias", section.label, alias.name),
        type: "alias",
        title: alias.name,
        subtitle: alias.command,
        keywords: [alias.name.toLowerCase(), alias.command.toLowerCase(), "alias"],
        icon: { source: Icon.Terminal, tintColor: MODERN_COLORS.success },
        copyValue: `alias ${alias.name}='${shellQuoteSingle(alias.command)}'`,
        name: alias.name,
        value: alias.command,
        rawValue: alias.command,
        section: section.label,
        isSecret: false,
      });
    });

    parseExports(section.content).forEach((exp) => {
      const secret = isSecretName(exp.variable);
      // The parser keeps the raw right-hand side verbatim (quotes included);
      // display, masking and Copy Value want the value itself
      const value = stripSurroundingQuotes(exp.value);
      results.push({
        ...makeIdentity("export", section.label, exp.variable),
        type: "export",
        title: exp.variable,
        subtitle: value,
        // A masked value must not be discoverable by typing it into search
        keywords: secret
          ? [exp.variable.toLowerCase(), "export", "env"]
          : [exp.variable.toLowerCase(), value.toLowerCase(), "export", "env"],
        icon: { source: Icon.Upload, tintColor: MODERN_COLORS.primary },
        // Definition copied as written in the file — re-quoting a value that
        // already carries quotes would change what the line means
        copyValue: `export ${exp.variable}=${exp.value}`,
        name: exp.variable,
        value,
        rawValue: exp.value,
        section: section.label,
        isSecret: secret,
      });
    });

    parseFunctions(section.content).forEach((func) => {
      results.push({
        ...makeIdentity("function", section.label, func.name),
        type: "function",
        title: func.name,
        subtitle: "function",
        keywords: [func.name.toLowerCase(), "function", "func"],
        icon: { source: Icon.Code, tintColor: MODERN_COLORS.purple },
        copyValue: func.name,
        name: func.name,
        value: func.name,
        rawValue: func.name,
        section: section.label,
        isSecret: false,
      });
    });

    parsePlugins(section.content).forEach((plugin) => {
      results.push({
        ...makeIdentity("plugin", section.label, plugin.name),
        type: "plugin",
        title: plugin.name,
        subtitle: "plugin",
        keywords: [plugin.name.toLowerCase(), "plugin"],
        icon: { source: Icon.Plug, tintColor: MODERN_COLORS.warning },
        copyValue: plugin.name,
        name: plugin.name,
        value: plugin.name,
        rawValue: plugin.name,
        section: section.label,
        isSecret: false,
      });
    });

    parseSources(section.content).forEach((source) => {
      results.push({
        ...makeIdentity("source", section.label, source.path),
        type: "source",
        title: source.path,
        subtitle: "source",
        keywords: [source.path.toLowerCase(), "source"],
        icon: { source: Icon.Document, tintColor: Color.Orange },
        copyValue: `source ${source.path}`,
        name: source.path,
        value: source.path,
        rawValue: source.path,
        section: section.label,
        isSecret: false,
      });
    });

    parseEvals(section.content).forEach((evalCmd) => {
      results.push({
        ...makeIdentity("eval", section.label, evalCmd.command),
        type: "eval",
        title: truncateValueMiddle(evalCmd.command, 60),
        subtitle: "eval",
        keywords: [evalCmd.command.toLowerCase(), "eval"],
        icon: { source: Icon.Terminal, tintColor: MODERN_COLORS.error },
        // Copied as written — escaping would break command substitution
        copyValue: `eval ${evalCmd.command}`,
        name: evalCmd.command,
        value: evalCmd.command,
        rawValue: evalCmd.command,
        section: section.label,
        isSecret: false,
      });
    });

    parseSetopts(section.content).forEach((setopt) => {
      results.push({
        ...makeIdentity("setopt", section.label, setopt.option),
        type: "setopt",
        title: setopt.option,
        subtitle: "setopt",
        keywords: [setopt.option.toLowerCase(), "setopt", "option"],
        icon: { source: Icon.Gear, tintColor: MODERN_COLORS.neutral },
        copyValue: `setopt ${setopt.option}`,
        name: setopt.option,
        value: setopt.option,
        rawValue: setopt.option,
        section: section.label,
        isSecret: false,
      });
    });
  });

  return results;
}

/**
 * Filters results based on search text
 */
export function filterResults(results: SearchResult[], searchText: string): SearchResult[] {
  if (!searchText.trim()) {
    return results;
  }

  const query = searchText.toLowerCase();
  return results.filter((result) => result.keywords.some((keyword) => keyword.includes(query)));
}

/**
 * Groups results by type for display
 */
export function groupResultsByType(results: SearchResult[]): Map<string, SearchResult[]> {
  const groups = new Map<string, SearchResult[]>();

  results.forEach((result) => {
    const existing = groups.get(result.type) || [];
    existing.push(result);
    groups.set(result.type, existing);
  });

  return groups;
}

/**
 * Gets display name for result type
 */
export function getTypeDisplayName(type: string): string {
  const names: Record<string, string> = {
    alias: "Aliases",
    export: "Exports",
    function: "Functions",
    plugin: "Plugins",
    source: "Sources",
    eval: "Evals",
    setopt: "Setopts",
  };
  return names[type] || type;
}

interface SearchResultListItemProps {
  result: SearchResult;
  refresh: () => void;
  revealed: boolean;
  onToggleReveal: () => void;
}

/**
 * List item for a cross-type search result carrying the full action set:
 * Edit and Delete for the types that have editors (aliases, exports), and
 * Copy Value / Copy Name / Copy Definition, Reveal Value, Open, Refresh
 * everywhere. Secret export values render masked until revealed.
 */
export function SearchResultListItem({ result, refresh, revealed, onToggleReveal }: SearchResultListItemProps) {
  const displaySubtitle =
    result.isSecret && !revealed ? maskValue(result.subtitle) : truncateValueMiddle(result.subtitle, 50);
  const accessories: List.Item.Accessory[] = [{ tag: result.type }];
  if (result.isSecret) {
    accessories.unshift({
      icon: { source: Icon.Lock, tintColor: Color.Red },
      tooltip: "Secret — value masked",
    });
  }

  const editTarget =
    result.type === "alias" ? (
      <EditAlias
        existingName={result.name}
        existingCommand={result.value}
        sectionLabel={result.section}
        sectionOccurrence={result.sectionOccurrence}
        onSave={refresh}
      />
    ) : result.type === "export" ? (
      <EditExport
        existingVariable={result.name}
        existingValue={result.rawValue}
        sectionLabel={result.section}
        sectionOccurrence={result.sectionOccurrence}
        onSave={refresh}
      />
    ) : undefined;

  const deleteConfig = result.type === "alias" ? aliasConfig : result.type === "export" ? exportConfig : undefined;
  const onDelete = deleteConfig
    ? async () => {
        try {
          await deleteItem(result.name, deleteConfig, false, result.section, result.sectionOccurrence);
          refresh();
        } catch {
          // Error already shown in deleteItem
        }
      }
    : undefined;

  return (
    <List.Item
      key={result.id}
      title={result.title}
      subtitle={result.subtitle !== result.type ? displaySubtitle : ""}
      icon={result.icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <SharedActionsSection
            onRefresh={refresh}
            item={{
              editTitle: result.type === "alias" ? "Edit Alias" : "Edit Export",
              editTarget,
              deleteTitle: result.type === "alias" ? "Delete Alias" : "Delete Export",
              onDelete,
              copyName: result.name,
              copyValue: result.value,
              copyDefinition: result.copyValue,
              isSecret: result.isSecret,
              revealed,
              onToggleReveal: result.isSecret ? onToggleReveal : undefined,
            }}
          />
        </ActionPanel>
      }
    />
  );
}
