import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { readZshrcFile, writeZshrcFile } from "./lib/zsh";
import { ZSHRC_PATH } from "./lib/zsh";

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
 * Form component for creating or editing exports
 */
export default function EditExport({
  existingVariable,
  existingValue,
  sectionLabel,
  onSave,
}: EditExportProps) {
  const isEditing = !!existingVariable;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);

  const { itemProps } = useForm({
    initialValues: {
      variable: existingVariable || "",
      value: existingValue || "",
    },
    onSubmit: async (values) => {
      const variable = values.variable?.trim() || "";
      const value = values.value?.trim() || "";

      if (!variable || !value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Both variable name and value are required",
        });
        return;
      }

      try {
        const zshrcContent = await readZshrcFile();

        if (isEditing) {
          // Update existing export
          const exportPattern = new RegExp(
            `^(\\s*)(?:export|typeset\\s+-x)\\s+${existingVariable}\\s*=\\s*.*?$`,
            "gm",
          );
          const replacement = `export ${variable}=${value}`;

          if (!exportPattern.test(zshrcContent)) {
            throw new Error(`Export "${existingVariable}" not found in zshrc`);
          }

          const updatedContent = zshrcContent.replace(
            exportPattern,
            replacement,
          );
          await writeZshrcFile(updatedContent);

          await showToast({
            style: Toast.Style.Success,
            title: "Export Updated",
            message: `Updated export "${variable}"`,
          });
        } else {
          // Add new export
          const exportLine = `export ${variable}=${value}`;

          // Find the section to add the export to
          let updatedContent = zshrcContent;

          if (sectionLabel) {
            // Find the section and add the export at the end
            const sectionPattern = new RegExp(
              `(#\\s*section\\s*:\\s*${sectionLabel}[\\s\\S]*?)(?=#\\s*section\\s*:|$)`,
              "i",
            );
            const sectionMatch = zshrcContent.match(sectionPattern);

            if (sectionMatch) {
              const sectionEnd = sectionMatch[0].lastIndexOf("\n");
              const beforeSection = zshrcContent.substring(
                0,
                sectionMatch.index! + sectionEnd + 1,
              );
              const afterSection = zshrcContent.substring(
                sectionMatch.index! + sectionEnd + 1,
              );

              updatedContent = `${beforeSection}\n${exportLine}\n${afterSection}`;
            } else {
              // Section not found, add at the end of file
              updatedContent = `${zshrcContent}\n\n# ${sectionLabel}\n${exportLine}`;
            }
          } else {
            // No specific section, add at the end
            updatedContent = `${zshrcContent}\n\n${exportLine}`;
          }

          await writeZshrcFile(updatedContent);

          await showToast({
            style: Toast.Style.Success,
            title: "Export Added",
            message: `Added export "${variable}"`,
          });
        }

        onSave?.();
        popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to save export",
        });
      }
    },
    validation: {
      variable: (value) => {
        if (!value?.trim()) return "Variable name is required";
        if (!/^[A-Z_][A-Z0-9_]*$/.test(value.trim())) {
          return "Variable name must be uppercase and contain only letters, numbers, and underscores";
        }
        return undefined;
      },
      value: (value) => {
        if (!value?.trim()) return "Value is required";
        return undefined;
      },
    },
  });

  const handleSave = async (values: { variable: string; value: string }) => {
    if (!values.variable?.trim() || !values.value?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Both variable name and value are required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const zshrcContent = await readZshrcFile();

      if (isEditing) {
        // Update existing export
        const exportPattern = new RegExp(
          `^(\\s*)(?:export|typeset\\s+-x)\\s+${existingVariable}\\s*=\\s*.*?$`,
          "gm",
        );
        const replacement = `export ${values.variable}=${values.value}`;

        if (!exportPattern.test(zshrcContent)) {
          throw new Error(`Export "${existingVariable}" not found in zshrc`);
        }

        const updatedContent = zshrcContent.replace(exportPattern, replacement);
        await writeZshrcFile(updatedContent);

        await showToast({
          style: Toast.Style.Success,
          title: "Export Updated",
          message: `Updated export "${values.variable}"`,
        });
      } else {
        // Add new export
        const exportLine = `export ${values.variable}=${values.value}`;

        // Find the section to add the export to
        let updatedContent = zshrcContent;

        if (sectionLabel) {
          // Find the section and add the export at the end
          const sectionPattern = new RegExp(
            `(#\\s*section\\s*:\\s*${sectionLabel}[\\s\\S]*?)(?=#\\s*section\\s*:|$)`,
            "i",
          );
          const sectionMatch = zshrcContent.match(sectionPattern);

          if (sectionMatch) {
            const sectionEnd = sectionMatch[0].lastIndexOf("\n");
            const beforeSection = zshrcContent.substring(
              0,
              sectionMatch.index! + sectionEnd + 1,
            );
            const afterSection = zshrcContent.substring(
              sectionMatch.index! + sectionEnd + 1,
            );

            updatedContent = `${beforeSection}\n${exportLine}\n${afterSection}`;
          } else {
            // Section not found, add at the end of file
            updatedContent = `${zshrcContent}\n\n# ${sectionLabel}\n${exportLine}`;
          }
        } else {
          // No specific section, add at the end
          updatedContent = `${zshrcContent}\n\n${exportLine}`;
        }

        await writeZshrcFile(updatedContent);

        await showToast({
          style: Toast.Style.Success,
          title: "Export Added",
          message: `Added export "${values.variable}"`,
        });
      }

      onSave?.();
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to save export",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !existingVariable) return;

    setIsLoading(true);

    try {
      const zshrcContent = await readZshrcFile();
      const exportPattern = new RegExp(
        `^(\\s*)(?:export|typeset\\s+-x)\\s+${existingVariable}\\s*=\\s*.*?$`,
        "gm",
      );

      if (!exportPattern.test(zshrcContent)) {
        throw new Error(`Export "${existingVariable}" not found in zshrc`);
      }

      const updatedContent = zshrcContent.replace(exportPattern, "");
      await writeZshrcFile(updatedContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Export Deleted",
        message: `Deleted export "${existingVariable}"`,
      });

      onSave?.();
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to delete export",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={
        isEditing ? `Edit Export: ${existingVariable}` : "Add New Export"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Export" : "Add Export"}
            icon={Icon.Check}
            onSubmit={handleSave}
          />
          {isEditing && (
            <Action
              title="Delete Export"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
          )}
          <Action.Open
            title="Open ~/.Zshrc"
            target={ZSHRC_PATH}
            icon={Icon.Document}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.variable}
        title="Variable Name"
        placeholder="e.g., PATH, EDITOR, NODE_ENV"
      />

      <Form.TextField
        {...itemProps.value}
        title="Value"
        placeholder="e.g., /usr/local/bin, vim, production"
      />

      {sectionLabel && (
        <Form.Description
          title="Section"
          text={`This export will be added to the "${sectionLabel}" section`}
        />
      )}
    </Form>
  );
}
