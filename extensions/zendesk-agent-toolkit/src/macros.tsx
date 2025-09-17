import {
  Action,
  ActionPanel,
  Form,
  List,
  Detail,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getMacros, applyMacro, createMacro, getMacroPreview, getTicketField, Macro, MacroAction } from "./zendesk";
import AISuggestions from "./ai-suggestions";
import ZendeskPlaceholders from "./zendesk-placeholders";
import {
  StatusDropdown,
  PriorityDropdown,
  MacroListItem,
  ConditionalFieldGroup,
  FormSeparator,
  showErrorToast,
  showWarningToast,
  handleError,
  withErrorHandling,
} from "./components/common";

// Wrapper component to handle the props issue
function AISuggestionsWrapper({ onRefresh }: { onRefresh?: () => Promise<void> }) {
  return React.createElement(AISuggestions, { onRefresh });
}

interface MacroListProps {
  ticketId?: number;
  onMacroApplied?: () => void;
}

export function MacroList({ ticketId, onMacroApplied }: MacroListProps) {
  const [loading, setLoading] = useState(true);
  const [macros, setMacros] = useState<Macro[]>([]);

  useEffect(() => {
    loadMacros();
  }, []);

  async function loadMacros() {
    setLoading(true);
    try {
      const macrosList = await getMacros();
      setMacros(macrosList);
    } catch (e) {
      await handleError(e, "Load macros");
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyMacro(macroId: number, macroTitle: string) {
    if (!ticketId) {
      await showErrorToast("No ticket selected", "Cannot apply macro without a ticket");
      return;
    }

    const result = await withErrorHandling(
      async () => {
        await applyMacro(ticketId, macroId);
      },
      "Apply macro",
      {
        showLoading: true,
        showSuccess: true,
        successMessage: `Applied "${macroTitle}" to ticket #${ticketId}`,
      },
    );

    if (result !== null) {
      if (onMacroApplied) {
        onMacroApplied();
      }
      popToRoot();
    }
  }

  return (
    <List
      isLoading={loading}
      navigationTitle={ticketId ? `Apply Macro to Ticket #${ticketId}` : "Manage Macros"}
      searchBarPlaceholder="Search macros..."
      actions={
        <ActionPanel>
          <Action.Push title="Create New Macro" target={<CreateMacroForm onMacroCreated={loadMacros} />} />
          <Action.Push
            title="AI Suggestions"
            icon="🤖"
            target={<AISuggestionsWrapper onRefresh={loadMacros} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel>
      }
    >
      {macros.map((macro) => (
        <MacroListItem
          id={macro.id}
          title={macro.title}
          description={macro.description}
          actionsCount={macro.actions.length}
          updatedAt={macro.updated_at}
          actions={
            <ActionPanel>
              {ticketId && (
                <Action
                  title={`Apply to Ticket #${ticketId}`}
                  icon="⚡"
                  onAction={() => handleApplyMacro(macro.id, macro.title)}
                />
              )}
              <Action.Push
                title="View Details"
                target={<MacroDetails macro={macro} ticketId={ticketId} onMacroApplied={onMacroApplied} />}
              />
              {ticketId && (
                <Action.Push
                  title="Preview Changes"
                  target={<MacroPreview macroId={macro.id} ticketId={ticketId} macroTitle={macro.title} />}
                />
              )}
              <Action.Push title="Create New Macro" target={<CreateMacroForm onMacroCreated={loadMacros} />} />
              <Action.Push title="AI Suggestions" icon="🤖" target={<AISuggestionsWrapper onRefresh={loadMacros} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface MacroDetailsProps {
  macro: Macro;
  ticketId?: number;
  onMacroApplied?: () => void;
}

function MacroDetails({ macro, ticketId, onMacroApplied }: MacroDetailsProps) {
  async function handleApplyMacro() {
    if (!ticketId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No ticket selected",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Applying macro: ${macro.title}`,
      });

      await applyMacro(ticketId, macro.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Macro applied successfully",
      });

      if (onMacroApplied) {
        onMacroApplied();
      }
      popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply macro",
        message: String(e),
      });
    }
  }

  const formatActions = (actions: MacroAction[]): string => {
    return actions
      .map((action) => {
        const field = action.field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        let value = String(action.value);

        // Format special field values
        if (action.field === "status" && typeof action.value === "string") {
          value = action.value.charAt(0).toUpperCase() + action.value.slice(1);
        }

        return `**${field}:** ${value}`;
      })
      .join("\n\n");
  };

  const markdown = `
# ${macro.title}

${macro.description ? `*${macro.description}*` : "*No description provided*"}

---

## Actions

${formatActions(macro.actions)}

---

**Created:** ${new Date(macro.created_at).toLocaleDateString()}  
**Updated:** ${new Date(macro.updated_at).toLocaleDateString()}  
**ID:** ${macro.id}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {ticketId && <Action title={`Apply to Ticket #${ticketId}`} icon="⚡" onAction={handleApplyMacro} />}
          {ticketId && (
            <Action.Push
              title="Preview Changes"
              target={<MacroPreview macroId={macro.id} ticketId={ticketId} macroTitle={macro.title} />}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

interface MacroPreviewProps {
  macroId: number;
  ticketId: number;
  macroTitle: string;
}

function MacroPreview({ macroId, ticketId, macroTitle }: MacroPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  async function loadPreview() {
    setLoading(true);
    try {
      const previewData = await getMacroPreview(ticketId, macroId);
      setPreview(previewData);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load preview",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyMacro() {
    try {
      await applyMacro(ticketId, macroId);
      await showToast({
        style: Toast.Style.Success,
        title: "Macro applied successfully",
      });
      popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply macro",
        message: String(e),
      });
    }
  }

  if (loading || !preview) {
    return <Detail isLoading={true} markdown="Loading macro preview..." />;
  }

  const markdown = `
# Macro Preview: ${macroTitle}

## Changes that will be applied to Ticket #${ticketId}:

**Status:** ${preview.result.ticket.status}  
**Subject:** ${preview.result.ticket.subject}

${
  preview.result.ticket.comment
    ? `
## Comment that will be added:

**Type:** ${preview.result.ticket.comment.public ? "Public" : "Internal"}

${preview.result.ticket.comment.body}
`
    : ""
}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Apply Macro" icon="⚡" onAction={handleApplyMacro} />
        </ActionPanel>
      }
    />
  );
}

interface CreateMacroFormProps {
  onMacroCreated?: () => void;
}

function CreateMacroForm({ onMacroCreated }: CreateMacroFormProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Status action
  const [changeStatus, setChangeStatus] = useState(false);
  const [statusValue, setStatusValue] = useState("");

  // Priority action
  const [changePriority, setChangePriority] = useState(false);
  const [priorityValue, setPriorityValue] = useState("");

  // Comment action
  const [addComment, setAddComment] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentPublic, setCommentPublic] = useState(true);

  // Assignment action
  const [changeAssignee, setChangeAssignee] = useState(false);
  const [assigneeValue, setAssigneeValue] = useState("");

  // Custom fields
  const [changeSystemField, setChangeSystemField] = useState(false);
  const [systemFieldValue, setSystemFieldValue] = useState("");
  const [systemFieldOptions, setSystemFieldOptions] = useState<Array<{ id: number; name: string; value: string }>>([]);
  const [changeIssueField, setChangeIssueField] = useState(false);
  const [issueFieldValue, setIssueFieldValue] = useState("");
  const [issueFieldOptions, setIssueFieldOptions] = useState<Array<{ id: number; name: string; value: string }>>([]);

  // Get preferences for custom field IDs
  const preferences = getPreferenceValues<{
    enableSystemField?: boolean;
    systemFieldId?: string;
    enableIssueField?: boolean;
    issueFieldId?: string;
  }>();

  // Load custom field options on component mount
  useEffect(() => {
    async function loadFieldOptions() {
      try {
        if (preferences.enableSystemField && preferences.systemFieldId) {
          const systemField = await getTicketField(preferences.systemFieldId);
          if (systemField.custom_field_options) {
            setSystemFieldOptions(systemField.custom_field_options);
          }
        }

        if (preferences.enableIssueField && preferences.issueFieldId) {
          const issueField = await getTicketField(preferences.issueFieldId);
          if (issueField.custom_field_options) {
            setIssueFieldOptions(issueField.custom_field_options);
          }
        }
      } catch (error) {
        console.error("Failed to load field options:", error);
      }
    }

    loadFieldOptions();
  }, [preferences.systemFieldId, preferences.issueFieldId]);

  async function handleSubmit() {
    if (!title.trim()) {
      await showErrorToast("Title required", "Please enter a title for the macro");
      return;
    }

    const actions: MacroAction[] = [];

    // Add status action
    if (changeStatus && statusValue) {
      actions.push({ field: "status", value: statusValue });
    }

    // Add priority action
    if (changePriority && priorityValue) {
      actions.push({ field: "priority", value: priorityValue });
    }

    // Add comment action (try Zendesk standard format)
    if (addComment && commentBody.trim()) {
      actions.push({
        field: "comment_value",
        value: commentBody,
      });
      actions.push({
        field: "comment_mode_is_public",
        value: commentPublic,
      });
    }

    // Add assignee action
    if (changeAssignee) {
      actions.push({
        field: "assignee_id",
        value: assigneeValue === "current_user" ? "current_user" : assigneeValue,
      });
    }

    // Add custom field actions
    if (changeSystemField && preferences.enableSystemField && preferences.systemFieldId && systemFieldValue) {
      actions.push({
        field: `custom_fields_${preferences.systemFieldId}`,
        value: systemFieldValue,
      });
    }

    if (changeIssueField && preferences.enableIssueField && preferences.issueFieldId && issueFieldValue) {
      actions.push({
        field: `custom_fields_${preferences.issueFieldId}`,
        value: issueFieldValue,
      });
    }

    if (actions.length === 0) {
      await showErrorToast("No actions defined", "Please define at least one action for the macro");
      return;
    }

    setLoading(true);

    const result = await withErrorHandling(
      async () => {
        const macroData = {
          title: title.trim(),
          description: description.trim() || undefined,
          actions,
        };

        console.log("Creating macro with data:", JSON.stringify(macroData, null, 2));
        console.log("Individual actions:", actions);

        const result = await createMacro(macroData);
        console.log("Macro creation result:", result);

        // Verify the macro was actually created by trying to fetch it
        setTimeout(async () => {
          try {
            const updatedMacros = await getMacros();
            const createdMacro = updatedMacros.find((m) => m.title === title.trim());
            if (createdMacro) {
              console.log("Macro verification successful:", createdMacro);
            } else {
              console.warn("Macro not found in updated list - creation may have failed silently");
              await showWarningToast("Warning", "Macro may not have been saved properly");
            }
          } catch (error) {
            console.error("Failed to verify macro creation:", error);
          }
        }, 2000);

        return result;
      },
      "Create macro",
      {
        showLoading: true,
        showSuccess: true,
        successMessage: `Created macro: ${title}`,
      },
    );

    if (result) {
      if (onMacroCreated) {
        await onMacroCreated();
      }
      popToRoot();
    }

    setLoading(false);
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Macro" onSubmit={handleSubmit} />
          <Action.Push
            title="View Placeholders"
            icon="📝"
            target={<ZendeskPlaceholders />}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Macro Title"
        placeholder="e.g., Escalate to L2 Support"
        value={title}
        onChange={setTitle}
      />

      <Form.TextField
        id="description"
        title="Description (Optional)"
        placeholder="Brief description of what this macro does"
        value={description}
        onChange={setDescription}
      />

      <FormSeparator />

      {/* Status Action */}
      <ConditionalFieldGroup
        checkboxId="changeStatus"
        checkboxLabel="Change Status"
        checkboxValue={changeStatus}
        onCheckboxChange={setChangeStatus}
      >
        <StatusDropdown id="status" title="New Status" value={statusValue} onChange={setStatusValue} />
      </ConditionalFieldGroup>

      {/* Priority Action */}
      <ConditionalFieldGroup
        checkboxId="changePriority"
        checkboxLabel="Change Priority"
        checkboxValue={changePriority}
        onCheckboxChange={setChangePriority}
      >
        <PriorityDropdown id="priority" title="New Priority" value={priorityValue} onChange={setPriorityValue} />
      </ConditionalFieldGroup>

      {/* Assignment Action */}
      <ConditionalFieldGroup
        checkboxId="changeAssignee"
        checkboxLabel="Change Assignee"
        checkboxValue={changeAssignee}
        onCheckboxChange={setChangeAssignee}
      >
        <Form.Dropdown id="assignee" title="Assign To" value={assigneeValue} onChange={setAssigneeValue}>
          <Form.Dropdown.Item value="current_user" title="Assign to Me" />
          <Form.Dropdown.Item value="" title="Unassigned" />
        </Form.Dropdown>
      </ConditionalFieldGroup>

      <FormSeparator />

      {/* Custom Fields */}
      {preferences.enableSystemField && preferences.systemFieldId && (
        <ConditionalFieldGroup
          checkboxId="changeSystemField"
          checkboxLabel="Set System Field"
          checkboxValue={changeSystemField}
          onCheckboxChange={setChangeSystemField}
        >
          <Form.Dropdown
            id="systemField"
            title="System Field Value"
            value={systemFieldValue}
            onChange={setSystemFieldValue}
          >
            <Form.Dropdown.Item value="" title="Select System..." />
            {systemFieldOptions.map((option) => (
              <Form.Dropdown.Item value={option.value} title={option.name} />
            ))}
          </Form.Dropdown>
        </ConditionalFieldGroup>
      )}

      {preferences.enableIssueField && preferences.issueFieldId && (
        <ConditionalFieldGroup
          checkboxId="changeIssueField"
          checkboxLabel="Set Issue Field"
          checkboxValue={changeIssueField}
          onCheckboxChange={setChangeIssueField}
        >
          <Form.Dropdown
            id="issueField"
            title="Issue Field Value"
            value={issueFieldValue}
            onChange={setIssueFieldValue}
          >
            <Form.Dropdown.Item value="" title="Select Issue..." />
            {issueFieldOptions.map((option) => (
              <Form.Dropdown.Item value={option.value} title={option.name} />
            ))}
          </Form.Dropdown>
        </ConditionalFieldGroup>
      )}

      {/* Comment Action */}
      <ConditionalFieldGroup
        checkboxId="addComment"
        checkboxLabel="Add Comment"
        checkboxValue={addComment}
        onCheckboxChange={setAddComment}
      >
        <Form.TextArea
          id="commentBody"
          title="Comment Text"
          placeholder="Enter the comment text..."
          value={commentBody}
          onChange={setCommentBody}
        />
        <Form.Checkbox id="commentPublic" label="Public Comment" value={commentPublic} onChange={setCommentPublic} />
      </ConditionalFieldGroup>

      <Form.Description text="Create a macro that applies multiple actions to tickets at once. Select the actions you want to include and configure their values." />
    </Form>
  );
}

export default MacroList;
