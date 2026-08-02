import EditItemForm, { type EditItemConfig } from "./lib/edit-item-form";
import { parseExports } from "./utils/parsers";
import { escapeRegExp } from "./utils/shell-escape";

interface EditExportProps {
  /** Existing variable name (for editing) */
  existingVariable?: string;
  /** Existing variable value (for editing) */
  existingValue?: string;
  /** Section where this export belongs */
  sectionLabel?: string;
  /** 0-based instance of the section label for duplicate labels */
  sectionOccurrence?: number | undefined;
  /** Callback when export is saved */
  onSave?: () => void;
}

/**
 * Configuration for editing exports
 */
export const exportConfig: EditItemConfig = {
  keyLabel: "Variable Name",
  valueLabel: "Value",
  keyPlaceholder: "e.g., PATH, EDITOR, NODE_ENV",
  valuePlaceholder: "e.g., /usr/local/bin, vim, production",
  keyPattern: /^[A-Z_][A-Z0-9_]*$/,
  keyValidationError: "Variable name must be uppercase and contain only letters, numbers, and underscores",
  generateLine: (variable, value) => `export ${variable}=${value}`,
  // Match export lines with quoted or unquoted values and optional inline
  // comments. The name is regex-escaped, and whitespace is horizontal-only:
  // `\s` would cross the newline and swallow the next line when the value is
  // empty.
  // Groups: (1) leading whitespace, (2) value, (3) inline comment.
  generatePattern: (variable) =>
    new RegExp(
      `^([ \\t]*)(?:export|typeset[ \\t]+-x)[ \\t]+${escapeRegExp(variable)}[ \\t]*=[ \\t]*([^\\n#]*?)([ \\t]*#.*)?$`,
      "gm",
    ),
  generateReplacement: (variable, value) => `export ${variable}=${value}`,
  // The same parser that rendered the item in the UI decides which lines are
  // its definitions, so the write path can never target a line the user
  // never saw (e.g. an empty export the display parser skips). Values
  // containing `#` are excluded: the write pattern splits the line at `#`,
  // so rewriting such a line would corrupt it — refusing is safer.
  matchesDisplayLine: (line, variable) =>
    parseExports(line).some((exp) => exp.variable === variable && !exp.value.includes("#")),
  itemType: "export",
  itemTypeCapitalized: "Export",
};

/**
 * Form component for creating or editing exports
 */
export default function EditExport({
  existingVariable,
  existingValue,
  sectionLabel,
  sectionOccurrence,
  onSave,
}: EditExportProps) {
  return (
    <EditItemForm
      existingKey={existingVariable}
      existingValue={existingValue}
      sectionLabel={sectionLabel}
      sectionOccurrence={sectionOccurrence}
      onSave={onSave}
      config={exportConfig}
    />
  );
}
