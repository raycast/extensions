import {
  Action,
  ActionPanel,
  Form,
  List,
  Detail,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { zdFetch, getAgentTicketUrl, getCurrentUserId, getAuthHeader } from "./zendesk";
import { MacroList } from "./macros";
import { TicketToArticleAction } from "./ticket-to-article";
import {
  StatusDropdown,
  TicketManagementActions,
  TicketListItem,
  FormSeparator,
  FieldGroup,
  StatusIndicator,
  withErrorHandling,
} from "./components/common";
import { open } from "@raycast/api";

interface Ticket {
  id: number;
  subject: string;
  status: string;
  updated_at: string;
  description?: string;
}

interface FullTicket {
  id: number;
  subject: string | null;
  status: string | null;
  description: string | null;
  updated_at: string;
  created_at: string;
  priority: string | null;
  requester_id: number;
  assignee_id?: number | null;
  custom_fields?: CustomField[];
}

interface CustomField {
  id: number;
  value: string | number | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Comment {
  id: number;
  body: string;
  public: boolean;
  author_id: number;
  created_at: string;
}

interface TicketResponse {
  ticket: FullTicket;
}

interface CommentsResponse {
  comments: Comment[];
}

interface UsersResponse {
  users: Array<{ id: number; name: string; email: string }>;
}

interface Group {
  id: number;
  name: string;
}

interface GroupsResponse {
  groups: Group[];
}

interface SearchResponse {
  results: Array<Ticket & { result_type: string }>;
}

export default function Tickets() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("type:ticket assignee:me status:open");
  const [searchText, setSearchText] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [onlyOpenTickets, setOnlyOpenTickets] = useState<boolean>(true);

  async function load(q: string) {
    if (!q || q.trim() === "") {
      console.log("Empty query, skipping load");
      return;
    }

    console.log("🔍 Loading tickets with query:", q);
    setLoading(true);
    try {
      const data = await zdFetch<SearchResponse>(
        `/api/v2/search.json?query=${encodeURIComponent(q)}&sort_by=updated_at&sort_order=desc`,
      );
      console.log(
        `📊 Found ${data.results.length} total results, ${data.results.filter((r) => r.result_type === "ticket").length} tickets`,
      );
      setTickets(data.results.filter((r) => r.result_type === "ticket"));
    } catch (e) {
      await showFailureToast(e, { title: "Failed to load tickets" });
    } finally {
      setLoading(false);
    }
  }

  async function loadGroups() {
    try {
      const data = await zdFetch<GroupsResponse>("/api/v2/groups.json");
      setGroups(data.groups);
    } catch (e) {
      console.error("Failed to load groups:", e);
    }
  }

  function buildQuery(assignmentType: "me" | "group", groupId?: number, openOnly?: boolean, searchTerms?: string) {
    const statusPart = openOnly ? "status:open" : "status:open status:pending status:new";

    // If there's search text, search across ALL tickets regardless of assignment
    if (searchTerms && searchTerms.trim()) {
      const searchText = searchTerms.trim();
      return `type:ticket ${statusPart} ${searchText}`;
    }

    // If no search text, filter by assignment as before
    if (assignmentType === "me") {
      return `type:ticket assignee:me ${statusPart}`;
    } else if (assignmentType === "group" && groupId) {
      return `type:ticket group:${groupId} ${statusPart}`;
    }
    return `type:ticket assignee:me ${statusPart}`;
  }

  function handleAssignmentTypeChange(type: "me" | "group", groupId?: number) {
    if (type === "me") {
      setSelectedGroupId(null);
      setQuery(buildQuery("me", undefined, onlyOpenTickets, searchText));
    } else if (type === "group" && groupId) {
      setSelectedGroupId(groupId);
      setQuery(buildQuery("group", groupId, onlyOpenTickets, searchText));
    }
  }

  function handleOpenTicketsToggle(checked: boolean) {
    setOnlyOpenTickets(checked);
    if (selectedGroupId) {
      setQuery(buildQuery("group", selectedGroupId, checked, searchText));
    } else {
      setQuery(buildQuery("me", undefined, checked, searchText));
    }
  }

  function handleSearchTextChange(text: string) {
    console.log("🔍 Search text changed to:", text);
    setSearchText(text);

    // Build the new query
    let newQuery: string;
    if (selectedGroupId) {
      newQuery = buildQuery("group", selectedGroupId, onlyOpenTickets, text);
      console.log("🔍 New query (group):", newQuery);
    } else {
      newQuery = buildQuery("me", undefined, onlyOpenTickets, text);
      console.log("🔍 New query (me):", newQuery);
    }

    console.log("🔍 Setting query to:", newQuery);
    setQuery(newQuery);
  }

  useEffect(() => {
    load(query);
  }, [query]);

  useEffect(() => {
    loadGroups();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={
        searchText ? "Searching all tickets..." : "Search tickets by title, description, or requester..."
      }
      onSearchTextChange={handleSearchTextChange}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Assignment"
          value={selectedGroupId ? `group-${selectedGroupId}` : "me"}
          onChange={(value) => {
            if (value === "me") {
              handleAssignmentTypeChange("me");
            } else if (value.startsWith("group-")) {
              const groupId = parseInt(value.replace("group-", ""));
              handleAssignmentTypeChange("group", groupId);
            }
          }}
        >
          <List.Dropdown.Item value="me" title="My Tickets" />
          {groups.map((group) => (
            <List.Dropdown.Item value={`group-${group.id}`} title={`Group: ${group.name}`} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title={onlyOpenTickets ? "Show All Tickets" : "Only Open Tickets"}
            icon={onlyOpenTickets ? "❌" : "✅"}
            onAction={() => handleOpenTicketsToggle(!onlyOpenTickets)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      {tickets.map((t: Ticket) => (
        <TicketListItem
          id={t.id}
          title={t.subject || `Ticket #${t.id}`}
          status={t.status}
          updatedAt={t.updated_at}
          actions={
            <ActionPanel>
              <TicketManagementActions
                onAssignToMe={() => assignToMe(t.id)}
                onMarkAsSolved={() => updateStatus(t.id, "solved")}
                onMarkAsPending={() => updateStatus(t.id, "pending")}
                onOpenInBrowser={() => open(getAgentTicketUrl(t.id))}
                onManageTicket={<TicketDetails ticketId={t.id} />}
                onApplyMacro={<MacroList ticketId={t.id} onMacroApplied={() => load(query)} />}
                onConvertToArticle={<TicketToArticleAction ticketId={t.id} ticketSubject={t.subject} />}
              />
              <Action
                title={onlyOpenTickets ? "Show All Tickets" : "Only Open Tickets"}
                icon={onlyOpenTickets ? "❌" : "✅"}
                onAction={() => handleOpenTicketsToggle(!onlyOpenTickets)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ManageTicketForm({ ticketId }: { ticketId: number }) {
  // Reply-related state
  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Ticket editing state
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<FullTicket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");

  const [systemFieldValue, setSystemFieldValue] = useState<string>("");
  const [issueFieldValue, setIssueFieldValue] = useState<string>("");

  // Custom field dropdown options
  const [systemOptions, setSystemOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "Select System..." },
  ]);
  const [issueOptions, setIssueOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "Select Issue..." },
  ]);

  const preferences = getPreferenceValues<{
    subdomain: string;
    email: string;
    apiToken: string;
    enableSystemField?: boolean;
    systemFieldId?: string;
    enableIssueField?: boolean;
    issueFieldId?: string;
  }>();

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", file.name);

    // Use fetch directly instead of zdFetch for FormData uploads
    const { subdomain } = getPreferenceValues<{ subdomain: string; email: string; apiToken: string }>();
    const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/uploads.json`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { upload: { token: string } };
    return data.upload.token;
  }

  async function handleFileSelection(filePaths: string[]) {
    if (filePaths.length === 0) return;

    setUploading(true);
    const uploadPromises = filePaths.map(async (filePath) => {
      try {
        // Read file from filesystem
        const fileResponse = await fetch(`file://${filePath}`);
        const fileBlob = await fileResponse.blob();
        const fileName = filePath.split("/").pop() || "image";

        // Check if it's an image
        if (!fileBlob.type.startsWith("image/")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid file type",
            message: `${fileName} is not an image file`,
          });
          return null;
        }

        const file = new File([fileBlob], fileName, { type: fileBlob.type });
        const token = await uploadImage(file);
        return token;
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to upload image",
          message: `Could not upload ${filePath.split("/").pop()}`,
        });
        return null;
      }
    });

    try {
      const uploadedTokens = await Promise.all(uploadPromises);
      const validTokens = uploadedTokens.filter((token) => token !== null) as string[];
      setAttachments((prev) => [...prev, ...validTokens]);

      if (validTokens.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `${validTokens.length} image(s) uploaded`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message: String(error),
      });
    } finally {
      setUploading(false);
    }
  }

  // Load ticket data and users on mount
  React.useEffect(() => {
    loadTicketAndUsers();
    loadCustomFieldOptions();
  }, [ticketId]);

  async function loadTicketAndUsers() {
    setLoading(true);
    try {
      const [ticketResponse, usersResponse] = await Promise.all([
        zdFetch<TicketResponse>(`/api/v2/tickets/${ticketId}.json`),
        loadAllAgents(),
      ]);

      const loadedTicket = ticketResponse.ticket;
      setTicket(loadedTicket);
      setUsers(usersResponse.users);

      // Set current values
      setSelectedStatus(loadedTicket.status || "");
      setSelectedAssigneeId(loadedTicket.assignee_id?.toString() || "");

      // Load custom field values with better null handling
      if (loadedTicket.custom_fields) {
        if (preferences.enableSystemField && preferences.systemFieldId) {
          const systemField = loadedTicket.custom_fields.find(
            (field) => field.id === parseInt(preferences.systemFieldId!),
          );
          const value = systemField?.value;
          setSystemFieldValue(value !== null && value !== undefined ? value.toString() : "");
          console.log("Loaded system field value:", value, "->", systemField?.value?.toString() || "");
        }

        if (preferences.enableIssueField && preferences.issueFieldId) {
          const issueField = loadedTicket.custom_fields.find(
            (field) => field.id === parseInt(preferences.issueFieldId!),
          );
          const value = issueField?.value;
          setIssueFieldValue(value !== null && value !== undefined ? value.toString() : "");
          console.log("Loaded issue field value:", value, "->", issueField?.value?.toString() || "");
        }
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load ticket details",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadAllAgents(): Promise<{ users: User[] }> {
    return await zdFetch<{ users: User[] }>("/api/v2/users.json?role[]=agent&role[]=admin");
  }

  async function loadCustomFieldOptions() {
    try {
      // Load system field options if enabled
      if (preferences.enableSystemField && preferences.systemFieldId) {
        const fieldResponse = await zdFetch<{
          ticket_field: { custom_field_options: Array<{ name: string; value: string }> };
        }>(`/api/v2/ticket_fields/${preferences.systemFieldId}.json`);
        const options = fieldResponse.ticket_field.custom_field_options.map((option) => ({
          value: option.value,
          label: option.name,
        }));
        setSystemOptions([{ value: "", label: "Select System..." }, ...options]);
      }

      // Load issue field options if enabled
      if (preferences.enableIssueField && preferences.issueFieldId) {
        const fieldResponse = await zdFetch<{
          ticket_field: { custom_field_options: Array<{ name: string; value: string }> };
        }>(`/api/v2/ticket_fields/${preferences.issueFieldId}.json`);
        const options = fieldResponse.ticket_field.custom_field_options.map((option) => ({
          value: option.value,
          label: option.name,
        }));
        setIssueOptions([{ value: "", label: "Select Issue..." }, ...options]);
      }
    } catch (e) {
      console.error("Failed to load custom field options:", e);
    }
  }

  async function submit() {
    await showToast({ style: Toast.Style.Animated, title: "Updating ticket…" });

    try {
      const updateData: {
        status?: string;
        assignee_id?: number | null;
        custom_fields?: Array<{ id: number; value: string | null }>;
        comment?: { body: string; public: boolean; uploads?: string[] };
      } = {};

      // Add ticket updates if changed
      if (selectedStatus && selectedStatus !== ticket?.status) {
        updateData.status = selectedStatus;
      }

      if (selectedAssigneeId !== ticket?.assignee_id?.toString()) {
        updateData.assignee_id = selectedAssigneeId ? parseInt(selectedAssigneeId) : null;
      }

      // Always send custom fields to ensure persistence
      const customFields: Array<{ id: number; value: string | null }> = [];

      if (preferences.enableSystemField && preferences.systemFieldId) {
        // Always include system field, even if empty
        customFields.push({
          id: parseInt(preferences.systemFieldId),
          value: systemFieldValue || null,
        });
      }

      if (preferences.enableIssueField && preferences.issueFieldId) {
        // Always include issue field, even if empty
        customFields.push({
          id: parseInt(preferences.issueFieldId),
          value: issueFieldValue || null,
        });
      }

      if (customFields.length > 0) {
        updateData.custom_fields = customFields;
        console.log("Sending custom fields:", customFields);
      }

      // Add comment if provided
      if (text.trim() || attachments.length > 0) {
        const comment: { body: string; public: boolean; uploads?: string[] } = {
          body: text,
          public: isPublic,
        };

        if (attachments.length > 0) {
          comment.uploads = attachments;
        }

        updateData.comment = comment;
      }

      console.log("Update data being sent:", JSON.stringify({ ticket: updateData }, null, 2));

      const response = await zdFetch(`/api/v2/tickets/${ticketId}.json`, {
        method: "PUT",
        body: JSON.stringify({ ticket: updateData }),
      });

      console.log("Update response:", response);

      await showToast({ style: Toast.Style.Success, title: "Ticket updated successfully" });
      popToRoot();
    } catch (e) {
      await showFailureToast(e, { title: "Failed to update ticket" });
    }
  }

  if (loading || !ticket) {
    return <Form isLoading={true} />;
  }

  const agents = users.filter((user) => user.role === "agent" || user.role === "admin");

  return (
    <Form
      isLoading={loading || uploading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Ticket" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title={`Manage Ticket #${ticketId}`} text={ticket.subject || ""} />

      {/* Ticket Status and Assignment */}
      <StatusDropdown value={selectedStatus} onChange={setSelectedStatus} />

      <Form.Dropdown id="assignee" title="Assignee" value={selectedAssigneeId} onChange={setSelectedAssigneeId}>
        <Form.Dropdown.Item value="" title="Unassigned" />
        {agents.map((agent) => (
          <Form.Dropdown.Item value={agent.id.toString()} title={agent.name} />
        ))}
      </Form.Dropdown>

      {/* Custom Fields */}
      {preferences.enableSystemField && preferences.systemFieldId && (
        <Form.Dropdown id="systemField" title="System" value={systemFieldValue} onChange={setSystemFieldValue}>
          {systemOptions.map((option) => (
            <Form.Dropdown.Item value={option.value} title={option.label} />
          ))}
        </Form.Dropdown>
      )}

      {preferences.enableIssueField && preferences.issueFieldId && (
        <Form.Dropdown id="issueField" title="Issue" value={issueFieldValue} onChange={setIssueFieldValue}>
          {issueOptions.map((option) => (
            <Form.Dropdown.Item value={option.value} title={option.label} />
          ))}
        </Form.Dropdown>
      )}

      <FormSeparator />

      {/* Reply Section */}
      <FieldGroup title="Add Reply (Optional)" description="Leave blank to only update ticket properties">
        <Form.Checkbox id="public" label="Public Reply" value={isPublic} onChange={setIsPublic} />

        <Form.TextArea
          id="body"
          title="Message"
          value={text}
          onChange={setText}
          enableMarkdown
          placeholder="Type your reply…"
        />

        <Form.FilePicker
          id="images"
          title="📎 Image Attachments"
          allowMultipleSelection={true}
          value={[]}
          onChange={handleFileSelection}
          canChooseDirectories={false}
          canChooseFiles={true}
          showHiddenFiles={false}
          info="Click to select images or drag files onto Raycast"
        />

        {attachments.length > 0 && (
          <StatusIndicator title="Uploaded Images" text={`${attachments.length} image(s) ready to attach`} />
        )}
        {uploading && <StatusIndicator title="Status" text="Uploading images" isLoading={true} />}
      </FieldGroup>
    </Form>
  );
}

async function assignToMe(ticketId: number) {
  await withErrorHandling(
    async () => {
      const me = await getCurrentUserId();
      await zdFetch(`/api/v2/tickets/${ticketId}.json`, {
        method: "PUT",
        body: JSON.stringify({ ticket: { assignee_id: me } }),
      });
    },
    "Assign ticket",
    {
      showSuccess: true,
      successMessage: "Assigned to you",
      useFailureToast: true,
    },
  );
}

async function updateStatus(ticketId: number, status: "pending" | "solved" | "open" | "hold") {
  await withErrorHandling(
    async () => {
      await zdFetch(`/api/v2/tickets/${ticketId}.json`, {
        method: "PUT",
        body: JSON.stringify({ ticket: { status } }),
      });
    },
    "Update status",
    {
      showSuccess: true,
      successMessage: `Marked ${status}`,
      useFailureToast: true,
    },
  );
}

function TicketDetails({ ticketId }: { ticketId: number }) {
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<FullTicket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<Record<number, { name: string; email: string }>>({});

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  async function loadTicketDetails() {
    setLoading(true);
    try {
      // Load ticket details and comments in parallel
      const [ticketResponse, commentsResponse] = await Promise.all([
        zdFetch<TicketResponse>(`/api/v2/tickets/${ticketId}.json`),
        zdFetch<CommentsResponse>(`/api/v2/tickets/${ticketId}/comments.json`),
      ]);

      setTicket(ticketResponse.ticket);
      setComments(commentsResponse.comments);

      // Get unique user IDs from ticket and comments
      const userIds = new Set([
        ticketResponse.ticket.requester_id,
        ...(ticketResponse.ticket.assignee_id ? [ticketResponse.ticket.assignee_id] : []),
        ...commentsResponse.comments.map((c) => c.author_id),
      ]);

      // Load user details
      if (userIds.size > 0) {
        const usersResponse = await zdFetch<UsersResponse>(
          `/api/v2/users/show_many.json?ids=${Array.from(userIds).join(",")}`,
        );
        const usersMap: Record<number, { name: string; email: string }> = {};
        usersResponse.users.forEach((user) => {
          usersMap[user.id] = { name: user.name, email: user.email };
        });
        setUsers(usersMap);
      }
    } catch (e) {
      await showFailureToast(e, { title: "Failed to load ticket details" });
    } finally {
      setLoading(false);
    }
  }

  if (loading || !ticket) {
    return <Detail isLoading={true} />;
  }

  const requesterName = users[ticket.requester_id]?.name || `User ${ticket.requester_id}`;
  const assigneeName = ticket.assignee_id
    ? users[ticket.assignee_id]?.name || `User ${ticket.assignee_id}`
    : "Unassigned";

  const formatField = (field: string | null | undefined) => {
    if (!field) return "N/A";
    return field.charAt(0).toUpperCase() + field.slice(1);
  };

  const markdown = `
# ${ticket.subject || `Ticket #${ticketId}`}

**Status:** ${formatField(ticket.status)}  
**Priority:** ${formatField(ticket.priority)}  
**Requester:** ${requesterName}  
**Assignee:** ${assigneeName}  
**Created:** ${new Date(ticket.created_at).toLocaleString()}  
**Updated:** ${new Date(ticket.updated_at).toLocaleString()}

---

## Description

${ticket.description || "No description provided"}

---

## Comments

${comments
  .slice(1)
  .map((comment) => {
    const authorName = users[comment.author_id]?.name || `User ${comment.author_id}`;
    const commentType = comment.public ? "Public" : "Internal";
    return `
### ${authorName} • ${commentType} • ${new Date(comment.created_at).toLocaleString()}

${comment.body}

---
`;
  })
  .join("")}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={getAgentTicketUrl(ticketId)} />
          <Action.Push title="Manage Ticket" target={<ManageTicketForm ticketId={ticketId} />} />
          <Action.Push
            title="Apply Macro"
            icon="⚡"
            target={<MacroList ticketId={ticketId} />}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <TicketToArticleAction ticketId={ticketId} ticketSubject={ticket?.subject || `Ticket ${ticketId}`} />
          <Action title="Assign to Me" onAction={() => assignToMe(ticketId)} />
          <Action title="Mark as Solved" onAction={() => updateStatus(ticketId, "solved")} />
          <Action title="Mark as Pending" onAction={() => updateStatus(ticketId, "pending")} />
        </ActionPanel>
      }
    />
  );
}
