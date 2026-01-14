import EditItemForm, { EditItemConfig } from "./lib/edit-item-form";

interface EditAliasProps {
  /** Existing alias name (for editing) */
  existingName?: string;
  /** Existing alias command (for editing) */
  existingCommand?: string;
  /** Section where this alias belongs */
  sectionLabel?: string;
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
  // Match alias lines with optional quotes and optional inline comments
  // Examples:
  //   alias ll='ls -la'
  //   alias ll=ls -la # comment
  //   alias ll = "ls -la"
  // Regex pattern breakdown:
  //   ^(\s*)           - Group 1: Leading whitespace (preserved)
  //   alias\s+          - Literal "alias" followed by whitespace
  //   ${name}           - The alias name (escaped in actual usage)
  //   \s*=\s*           - Optional whitespace around equals sign
  //   ([^\\\n#]*?)     - Group 2: Command value (non-greedy, stops at backslash, newline, or #)
  //   (\s*#.*)?        - Group 3: Optional inline comment
  //   $                 - End of line
  //   gm                - Global and multiline flags
  generatePattern: (name) => new RegExp(`^(\\s*)alias\\s+${name}\\s*=\\s*([^\\\n#]*?)(\\s*#.*)?$`, "gm"),
  generateReplacement: (name, command) => `alias ${name}='${command}'`,
  itemType: "alias",
  itemTypeCapitalized: "Alias",
};

/**
 * Form component for creating or editing aliases
 */
export default function EditAlias({ existingName, existingCommand, sectionLabel, onSave }: EditAliasProps) {
  return (
    <EditItemForm
      existingKey={existingName}
      existingValue={existingCommand}
      sectionLabel={sectionLabel}
      onSave={onSave}
      config={aliasConfig}
    />
  );
}
