import EditItemForm, { EditItemConfig } from "./lib/edit-item-form";

interface EditExportProps {
  /** Existing variable name (for editing) */
  existingVariable?: string;
  /** Existing variable value (for editing) */
  existingValue?: string;
  /** Section where this export belongs */
  sectionLabel?: string;
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
  // Match export lines with quoted or unquoted values and optional inline comments
  // Examples:
  //   export PATH="/usr/local/bin:$PATH"
  //   export PATH=/usr/local/bin:$PATH # comment
  //   typeset -x PATH=/usr/local/bin
  // Regex pattern breakdown:
  //   ^(\s*)                    - Group 1: Leading whitespace (preserved)
  //   (?:export|typeset\s+-x)    - Non-capturing group: matches "export" or "typeset -x"
  //   \s+                        - Whitespace after export/typeset
  //   ${variable}                - The variable name (escaped in actual usage)
  //   \s*=\s*                   - Optional whitespace around equals sign
  //   ([^\n#]*?)               - Group 2: Value (non-greedy, stops at newline or #)
  //   (\s*#.*)?                - Group 3: Optional inline comment
  //   $                         - End of line
  //   gm                        - Global and multiline flags
  generatePattern: (variable) =>
    new RegExp(`^(\\s*)(?:export|typeset\\s+-x)\\s+${variable}\\s*=\\s*([^\\\n#]*?)(\\s*#.*)?$`, "gm"),
  generateReplacement: (variable, value) => `export ${variable}=${value}`,
  itemType: "export",
  itemTypeCapitalized: "Export",
};

/**
 * Form component for creating or editing exports
 */
export default function EditExport({ existingVariable, existingValue, sectionLabel, onSave }: EditExportProps) {
  return (
    <EditItemForm
      existingKey={existingVariable}
      existingValue={existingValue}
      sectionLabel={sectionLabel}
      onSave={onSave}
      config={exportConfig}
    />
  );
}
