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
  generatePattern: (variable) => new RegExp(`^(\\s*)(?:export|typeset\\s+-x)\\s+${variable}\\s*=\\s*.*?$`, "gm"),
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
