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
  parsePathEntries,
  parseFpathEntries,
  parseKeybindings,
} from "../utils/parsers";
import { SharedActionsSection } from "./shared-actions";
import { deleteItem } from "./delete-item";
import { deriveLabel, disambiguate } from "./labels";
import EditAlias, { aliasConfig } from "../edit-alias";
import EditExport, { exportConfig } from "../edit-export";

/**
 * Unified search result item
 */
export interface SearchResult {
  id: string;
  type: "alias" | "export" | "function" | "plugin" | "source" | "eval" | "setopt" | "path" | "fpath" | "keybinding";
  /** Shortest unambiguous identifier — the list row title (see lib/labels) */
  label: string;
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
  const results: Omit<SearchResult, "label">[] = [];
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

    parsePathEntries(section.content).forEach((entry) => {
      results.push({
        ...makeIdentity("path", section.label, entry.entry),
        type: "path",
        title: entry.entry,
        subtitle: "path",
        keywords: [entry.entry.toLowerCase(), "path"],
        icon: { source: Icon.Tree, tintColor: MODERN_COLORS.neutral },
        copyValue: entry.entry,
        name: entry.entry,
        value: entry.entry,
        rawValue: entry.entry,
        section: section.label,
        isSecret: false,
      });
    });

    parseFpathEntries(section.content).forEach((entry) => {
      results.push({
        ...makeIdentity("fpath", section.label, entry.entry),
        type: "fpath",
        title: entry.entry,
        subtitle: "fpath",
        keywords: [entry.entry.toLowerCase(), "fpath"],
        icon: { source: Icon.Folder, tintColor: MODERN_COLORS.neutral },
        copyValue: entry.entry,
        name: entry.entry,
        value: entry.entry,
        rawValue: entry.entry,
        section: section.label,
        isSecret: false,
      });
    });

    parseKeybindings(section.content).forEach((binding) => {
      results.push({
        ...makeIdentity("keybinding", section.label, binding.key),
        type: "keybinding",
        title: binding.key,
        subtitle: binding.command,
        keywords: [binding.key.toLowerCase(), binding.command.toLowerCase(), "keybinding", "bindkey"],
        icon: { source: Icon.Keyboard, tintColor: MODERN_COLORS.neutral },
        copyValue: `bindkey '${binding.key}' ${binding.command}`,
        name: binding.key,
        value: binding.command,
        rawValue: binding.command,
        section: section.label,
        isSecret: false,
      });
    });
  });

  // Row titles follow the labelling rule: shortest unambiguous identifier.
  // Keybindings keep the key itself — shortening a key sequence would
  // change what it means.
  const labelled: SearchResult[] = results.map((result) => ({
    ...result,
    label: result.type === "keybinding" ? result.name : deriveLabel(result.name),
  }));
  return disambiguate(labelled, (result) => result.name);
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
    path: "PATH Entries",
    fpath: "FPATH Entries",
    keybinding: "Keybindings",
  };
  return names[type] || type;
}

/**
 * Gets singular display name for result type
 */
export function getTypeSingularName(type: string): string {
  const names: Record<string, string> = {
    alias: "Alias",
    export: "Export",
    function: "Function",
    plugin: "Plugin",
    source: "Source",
    eval: "Eval",
    setopt: "Setopt",
    path: "PATH entry",
    fpath: "FPATH entry",
    keybinding: "Keybinding",
  };
  return names[type] || type;
}

interface SearchResultListItemProps {
  result: SearchResult;
  refresh: () => void;
  revealed: boolean;
  onToggleReveal: () => void;
  /** Renders the detail pane (thin code block + metadata) when true */
  showDetail?: boolean;
  /** Renders the value as the row subtitle (only when the pane is hidden) */
  showSubtitle?: boolean;
  /** Called when the user acts on the row (frecency tracking) */
  onVisit?: (() => void) | undefined;
}

/**
 * Detail pane for a search result: a thin code block holding the value
 * only (the name is already the row title), plus metadata spent on facts
 * not already on screen.
 */
function SearchResultDetail({ result, revealed }: { result: SearchResult; revealed: boolean }) {
  const shownValue = result.isSecret && !revealed ? maskValue(result.value) : result.value;
  return (
    <List.Item.Detail
      markdown={`\`\`\`zsh\n${shownValue}\n\`\`\``}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={getTypeSingularName(result.type)} />
          <List.Item.Detail.Metadata.Label title="Section" text={result.section} icon={Icon.Folder} />
          {result.isSecret && (
            <List.Item.Detail.Metadata.TagList title="Sensitivity">
              <List.Item.Detail.Metadata.TagList.Item text="Secret" color={Color.Red} icon={Icon.Lock} />
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * List item for a cross-type search result carrying the full action set:
 * Edit and Delete for the types that have editors (aliases, exports), and
 * Copy Value / Copy Name / Copy Definition, Reveal Value, Open, Refresh
 * everywhere. Secret export values render masked until revealed.
 */
export function SearchResultListItem({
  result,
  refresh,
  revealed,
  onToggleReveal,
  showDetail = false,
  showSubtitle = true,
  onVisit,
}: SearchResultListItemProps) {
  const displaySubtitle =
    result.isSecret && !revealed ? maskValue(result.subtitle) : truncateValueMiddle(result.subtitle, 50);
  // Section appears exactly once: in the pane's metadata when it is
  // shown, as a row accessory when it is not
  const accessories: List.Item.Accessory[] = showDetail ? [] : [{ text: result.section, tooltip: "Section" }];
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

  const hasSubtitle = showSubtitle && result.subtitle !== result.type;
  return (
    <List.Item
      key={result.id}
      title={result.label}
      subtitle={hasSubtitle ? displaySubtitle : ""}
      icon={result.icon}
      accessories={accessories}
      detail={showDetail ? <SearchResultDetail result={result} revealed={revealed} /> : undefined}
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
              onVisit,
            }}
          />
        </ActionPanel>
      }
    />
  );
}
