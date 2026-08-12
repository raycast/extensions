import EditItemForm, { type EditItemConfig } from "./lib/edit-item-form";
import { parseAliases } from "./utils/parsers";
import { escapeRegExp } from "./utils/shell-escape";

interface EditAliasProps {
  /** Existing alias name (for editing) */
  existingName?: string;
  /** Existing alias command (for editing) */
  existingCommand?: string;
  /** Section where this alias belongs */
  sectionLabel?: string;
  /** 0-based instance of the section label for duplicate labels */
  sectionOccurrence?: number | undefined;
  /** Callback when alias is saved */
  onSave?: () => void;
}

/**
 * Configuration for editing aliases
 */
export const aliasConfig: EditItemConfig = {
  keyLabel: "Alias Name",
  valueLabel: "Command",
  keyPlaceholder: "e.g., ll, gs, dev",
  valuePlaceholder: "e.g., ls -la, git status, npm run dev",
  keyPattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  keyValidationError:
    "Alias name must start with letter or underscore and contain only letters, numbers, and underscores",
  generateLine: (name, command) => `alias ${name}='${command}'`,
  // Match alias lines with optional quotes and optional inline comments.
  // The name is regex-escaped (alias names may contain `.` or `-`), and
  // whitespace is horizontal-only: `\s` would cross the newline and swallow
  // the next line when the value is empty.
  // Groups: (1) leading whitespace, (2) value, (3) inline comment.
  generatePattern: (name) =>
    new RegExp(`^([ \\t]*)alias[ \\t]+${escapeRegExp(name)}[ \\t]*=[ \\t]*([^\\n#]*?)([ \\t]*#.*)?$`, "gm"),
  generateReplacement: (name, command) => `alias ${name}='${command}'`,
  // The same parser that rendered the item in the UI decides which lines are
  // its definitions, so the write path can never target a line the user
  // never saw (e.g. an unquoted alias the display parser skips). Commands
  // containing `#` are excluded: the write pattern splits the line at `#`,
  // so rewriting such a line would corrupt it — refusing is safer.
  matchesDisplayLine: (line, name) =>
    parseAliases(line).some((alias) => alias.name === name && !alias.command.includes("#")),
  itemType: "alias",
  itemTypeCapitalized: "Alias",
};

/**
 * Form component for creating or editing aliases
 */
export default function EditAlias({
  existingName,
  existingCommand,
  sectionLabel,
  sectionOccurrence,
  onSave,
}: EditAliasProps) {
  return (
    <EditItemForm
      existingKey={existingName}
      existingValue={existingCommand}
      sectionLabel={sectionLabel}
      sectionOccurrence={sectionOccurrence}
      onSave={onSave}
      config={aliasConfig}
    />
  );
}
