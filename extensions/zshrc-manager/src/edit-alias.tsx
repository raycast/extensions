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
 * Form component for creating or editing aliases
 */
export default function EditAlias({
  existingName,
  existingCommand,
  sectionLabel,
  onSave,
}: EditAliasProps) {
  const isEditing = !!existingName;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);

  const { itemProps } = useForm({
    initialValues: {
      name: existingName || "",
      command: existingCommand || "",
    },
    onSubmit: async (values) => {
      const name = values.name?.trim() || "";
      const command = values.command?.trim() || "";

      if (!name || !command) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Both alias name and command are required",
        });
        return;
      }

      try {
        const zshrcContent = await readZshrcFile();

        if (isEditing) {
          // Update existing alias
          const aliasPattern = new RegExp(
            `^(\\s*)alias\\s+${existingName}\\s*=\\s*(['"]).*?\\2\\s*$`,
            "gm",
          );
          const replacement = `alias ${name}='${command}'`;

          if (!aliasPattern.test(zshrcContent)) {
            throw new Error(`Alias "${existingName}" not found in zshrc`);
          }

          const updatedContent = zshrcContent.replace(
            aliasPattern,
            replacement,
          );
          await writeZshrcFile(updatedContent);

          await showToast({
            style: Toast.Style.Success,
            title: "Alias Updated",
            message: `Updated alias "${name}"`,
          });
        } else {
          // Add new alias
          const aliasLine = `alias ${name}='${command}'`;

          // Find the section to add the alias to
          let updatedContent = zshrcContent;

          if (sectionLabel) {
            // Find the section and add the alias at the end
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

              updatedContent = `${beforeSection}\n${aliasLine}\n${afterSection}`;
            } else {
              // Section not found, add at the end of file
              updatedContent = `${zshrcContent}\n\n# ${sectionLabel}\n${aliasLine}`;
            }
          } else {
            // No specific section, add at the end
            updatedContent = `${zshrcContent}\n\n${aliasLine}`;
          }

          await writeZshrcFile(updatedContent);

          await showToast({
            style: Toast.Style.Success,
            title: "Alias Added",
            message: `Added alias "${name}"`,
          });
        }

        onSave?.();
        popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to save alias",
        });
      }
    },
    validation: {
      name: (value) => {
        if (!value?.trim()) return "Alias name is required";
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.trim())) {
          return "Alias name must start with letter or underscore and contain only letters, numbers, and underscores";
        }
        return undefined;
      },
      command: (value) => {
        if (!value?.trim()) return "Command is required";
        return undefined;
      },
    },
  });

  const handleSave = async (values: { name: string; command: string }) => {
    if (!values.name?.trim() || !values.command?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Both alias name and command are required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const zshrcContent = await readZshrcFile();

      if (isEditing) {
        // Update existing alias
        const aliasPattern = new RegExp(
          `^(\\s*)alias\\s+${existingName}\\s*=\\s*(['"]).*?\\2\\s*$`,
          "gm",
        );
        const replacement = `alias ${values.name}='${values.command}'`;

        if (!aliasPattern.test(zshrcContent)) {
          throw new Error(`Alias "${existingName}" not found in zshrc`);
        }

        const updatedContent = zshrcContent.replace(aliasPattern, replacement);
        await writeZshrcFile(updatedContent);

        await showToast({
          style: Toast.Style.Success,
          title: "Alias Updated",
          message: `Updated alias "${values.name}"`,
        });
      } else {
        // Add new alias
        const aliasLine = `alias ${values.name}='${values.command}'`;

        // Find the section to add the alias to
        let updatedContent = zshrcContent;

        if (sectionLabel) {
          // Find the section and add the alias at the end
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

            updatedContent = `${beforeSection}\n${aliasLine}\n${afterSection}`;
          } else {
            // Section not found, add at the end of file
            updatedContent = `${zshrcContent}\n\n# ${sectionLabel}\n${aliasLine}`;
          }
        } else {
          // No specific section, add at the end
          updatedContent = `${zshrcContent}\n\n${aliasLine}`;
        }

        await writeZshrcFile(updatedContent);

        await showToast({
          style: Toast.Style.Success,
          title: "Alias Added",
          message: `Added alias "${values.name}"`,
        });
      }

      onSave?.();
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to save alias",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !existingName) return;

    setIsLoading(true);

    try {
      const zshrcContent = await readZshrcFile();
      const aliasPattern = new RegExp(
        `^(\\s*)alias\\s+${existingName}\\s*=\\s*(['"]).*?\\2\\s*$`,
        "gm",
      );

      if (!aliasPattern.test(zshrcContent)) {
        throw new Error(`Alias "${existingName}" not found in zshrc`);
      }

      const updatedContent = zshrcContent.replace(aliasPattern, "");
      await writeZshrcFile(updatedContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Alias Deleted",
        message: `Deleted alias "${existingName}"`,
      });

      onSave?.();
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to delete alias",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={
        isEditing ? `Edit Alias: ${existingName}` : "Add New Alias"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Alias" : "Add Alias"}
            icon={Icon.Check}
            onSubmit={handleSave}
          />
          {isEditing && (
            <Action
              title="Delete Alias"
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
        {...itemProps.name}
        title="Alias Name"
        placeholder="e.g., ll, gs, dev"
      />

      <Form.TextField
        {...itemProps.command}
        title="Command"
        placeholder="e.g., ls -la, git status, npm run dev"
      />

      {sectionLabel && (
        <Form.Description
          title="Section"
          text={`This alias will be added to the "${sectionLabel}" section`}
        />
      )}
    </Form>
  );
}
