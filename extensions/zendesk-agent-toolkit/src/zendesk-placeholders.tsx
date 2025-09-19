import React from "react";
import { Detail, ActionPanel, Action } from "@raycast/api";

interface PlaceholderCategory {
  name: string;
  placeholders: Array<{
    placeholder: string;
    description: string;
    example?: string;
  }>;
}

const placeholderCategories: PlaceholderCategory[] = [
  {
    name: "Ticket Information",
    placeholders: [
      { placeholder: "{{ticket.id}}", description: "Ticket ID number", example: "12345" },
      { placeholder: "{{ticket.title}}", description: "Ticket subject/title" },
      { placeholder: "{{ticket.description}}", description: "Original ticket description" },
      { placeholder: "{{ticket.status}}", description: "Current ticket status", example: "open, pending, solved" },
      { placeholder: "{{ticket.priority}}", description: "Ticket priority", example: "low, normal, high, urgent" },
      { placeholder: "{{ticket.created_at}}", description: "When the ticket was created" },
      { placeholder: "{{ticket.updated_at}}", description: "When the ticket was last updated" },
      { placeholder: "{{ticket.url}}", description: "Direct link to the ticket" },
      { placeholder: "{{ticket.tags}}", description: "All ticket tags" },
      { placeholder: "{{ticket.via}}", description: "How the ticket was created", example: "email, web, api" },
    ],
  },
  {
    name: "User Information",
    placeholders: [
      { placeholder: "{{ticket.requester.name}}", description: "Customer's full name" },
      { placeholder: "{{ticket.requester.first_name}}", description: "Customer's first name" },
      { placeholder: "{{ticket.requester.email}}", description: "Customer's email address" },
      { placeholder: "{{ticket.requester.language}}", description: "Customer's preferred language" },
      { placeholder: "{{ticket.requester.organization.name}}", description: "Customer's organization name" },
      { placeholder: "{{ticket.requester.details}}", description: "Customer's profile details" },
    ],
  },
  {
    name: "Agent Information",
    placeholders: [
      { placeholder: "{{ticket.assignee.name}}", description: "Assigned agent's full name" },
      { placeholder: "{{ticket.assignee.first_name}}", description: "Assigned agent's first name" },
      { placeholder: "{{ticket.assignee.email}}", description: "Assigned agent's email" },
      { placeholder: "{{ticket.assignee.signature}}", description: "Agent's signature" },
      { placeholder: "{{current_user.name}}", description: "Current user's full name" },
      { placeholder: "{{current_user.first_name}}", description: "Current user's first name" },
      { placeholder: "{{current_user.email}}", description: "Current user's email" },
      { placeholder: "{{current_user.signature}}", description: "Current user's signature" },
    ],
  },
  {
    name: "Organization & Account",
    placeholders: [
      { placeholder: "{{ticket.organization.name}}", description: "Organization name" },
      { placeholder: "{{ticket.account}}", description: "Account name" },
      { placeholder: "{{ticket.group.name}}", description: "Assigned group name" },
      { placeholder: "{{ticket.brand.name}}", description: "Brand name" },
      { placeholder: "{{ticket.brand.subdomain}}", description: "Brand subdomain" },
    ],
  },
  {
    name: "Custom Fields",
    placeholders: [
      {
        placeholder: "{{ticket.ticket_field_[ID]}}",
        description: "Custom ticket field by ID",
        example: "{{ticket.ticket_field_123456}}",
      },
      {
        placeholder: "{{ticket.ticket_field_option_title_[ID]}}",
        description: "Custom field option title",
        example: "{{ticket.ticket_field_option_title_123456}}",
      },
    ],
  },
  {
    name: "Time & Dates",
    placeholders: [
      { placeholder: "{{date}}", description: "Current date" },
      { placeholder: "{{time}}", description: "Current time" },
      { placeholder: "{{datetime}}", description: "Current date and time" },
      { placeholder: "{{ticket.created_at_with_timestamp}}", description: "Ticket creation with timestamp" },
      { placeholder: "{{ticket.updated_at_with_timestamp}}", description: "Last update with timestamp" },
    ],
  },
  {
    name: "Conditional & Logic",
    placeholders: [
      { placeholder: "{{#if ticket.assignee}}", description: "If ticket is assigned" },
      { placeholder: "{{#unless ticket.assignee}}", description: "If ticket is unassigned" },
      { placeholder: "{{#each ticket.comments}}", description: "Loop through comments" },
      { placeholder: "{{#if ticket.requester.organization}}", description: "If customer has organization" },
    ],
  },
];

export default function ZendeskPlaceholders() {
  const markdown = `# Zendesk Placeholder Reference

Use these placeholders in your macros to automatically insert dynamic content.

${placeholderCategories
  .map(
    (category) => `
## ${category.name}

${category.placeholders
  .map(
    (p) => `
**\`${p.placeholder}\`**  
${p.description}${
      p.example
        ? `  
*Example: ${p.example}*`
        : ""
    }
`,
  )
  .join("")}
`,
  )
  .join("")}

## Usage Tips

- **Copy any placeholder** by clicking the copy action
- **Test in macros** by creating a new macro and using these placeholders
- **HTML formatting** is supported in comments (use \`<strong>\`, \`<em>\`, etc.)
- **Conditional logic** helps create smart, context-aware responses
- **Custom fields** require the actual field ID from your Zendesk admin

## Common Examples

**Professional signature:**
\`\`\`
Best regards,
{{current_user.name}}
{{current_user.signature}}
\`\`\`

**Ticket reference:**
\`\`\`
Regarding ticket #{{ticket.id}}: "{{ticket.title}}"
\`\`\`

**Conditional assignment:**
\`\`\`
{{#if ticket.assignee}}
This ticket is assigned to {{ticket.assignee.name}}.
{{else}}
This ticket is currently unassigned.
{{/if}}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy All Placeholders"
            content={placeholderCategories.flatMap((cat) => cat.placeholders.map((p) => p.placeholder)).join("\n")}
          />
        </ActionPanel>
      }
    />
  );
}

// Component for quick placeholder insertion in forms
export function PlaceholderActions({ onInsert }: { onInsert: (placeholder: string) => void }) {
  const commonPlaceholders = [
    "{{ticket.requester.name}}",
    "{{ticket.assignee.name}}",
    "{{current_user.name}}",
    "{{current_user.signature}}",
    "{{ticket.id}}",
    "{{ticket.title}}",
  ];

  return (
    <ActionPanel.Section title="Insert Placeholder">
      {commonPlaceholders.map((placeholder) => (
        <Action title={`Insert ${placeholder}`} onAction={() => onInsert(placeholder)} />
      ))}
      <Action.Push title="View All Placeholders" target={<ZendeskPlaceholders />} icon="📝" />
    </ActionPanel.Section>
  );
}
