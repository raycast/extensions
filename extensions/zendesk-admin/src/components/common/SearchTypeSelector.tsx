import { Icon, List } from "@raycast/api";

export type SearchType =
  | "users"
  | "organizations"
  | "dynamic_content"
  | "macros"
  | "ticket_fields"
  | "support_addresses"
  | "ticket_forms"
  | "groups"
  | "tickets"
  | "views"
  | "triggers"
  | "brands"
  | "automations"
  | "custom_roles";

interface SearchTypeSelectorProps {
  value: SearchType;
  onChange: (value: SearchType) => void;
}

const searchTypeOptions = [
  { value: "users", title: "Users" },
  { value: "organizations", title: "Organizations" },
  { value: "dynamic_content", title: "Dynamic Content" },
  { value: "macros", title: "Macros" },
  { value: "ticket_fields", title: "Ticket Fields" },
  { value: "support_addresses", title: "Support Addresses" },
  { value: "ticket_forms", title: "Ticket Forms" },
  { value: "groups", title: "Groups" },
  { value: "tickets", title: "Tickets" },
  { value: "views", title: "Views" },
  { value: "triggers", title: "Triggers" },
  { value: "brands", title: "Brands" },
  { value: "automations", title: "Automations" },
  { value: "custom_roles", title: "Roles" },
] as const;

/**
 * Reusable search type selector dropdown
 */
export function SearchTypeSelector({ value, onChange }: SearchTypeSelectorProps) {
  return (
    <List.Dropdown
      value={value}
      onChange={(newValue) => onChange(newValue as SearchType)}
      placeholder="Select search type"
      tooltip="Select Search Type"
    >
      <List.Dropdown.Item title="Tickets" value="tickets" icon={Icon.Ticket} />
      <List.Dropdown.Item title="Users" value="users" icon={Icon.Person} />
      <List.Dropdown.Item title="Organizations" value="organizations" icon={Icon.Building} />
      <List.Dropdown.Item title="Groups" value="groups" icon={Icon.TwoPeople} />
      <List.Dropdown.Item title="Views" value="views" icon={Icon.Eye} />
      <List.Dropdown.Item title="Brands" value="brands" icon={Icon.Tag} />
      <List.Dropdown.Item title="Triggers" value="triggers" icon={Icon.Bolt} />
      <List.Dropdown.Item title="Automations" value="automations" icon={Icon.Gear} />
      <List.Dropdown.Item title="Macros" value="macros" icon={Icon.Code} />
      <List.Dropdown.Item title="Ticket Fields" value="ticket_fields" icon={Icon.List} />
      <List.Dropdown.Item title="Ticket Forms" value="ticket_forms" icon={Icon.Document} />
      <List.Dropdown.Item title="Dynamic Content" value="dynamic_content" icon={Icon.Text} />
      <List.Dropdown.Item title="Support Addresses" value="support_addresses" icon={Icon.Envelope} />
      <List.Dropdown.Item title="Roles" value="custom_roles" icon={Icon.Shield} />
    </List.Dropdown>
  );
}

/**
 * Get the display name for a search type
 */
export function getSearchTypeDisplayName(searchType: SearchType): string {
  const option = searchTypeOptions.find((opt) => opt.value === searchType);
  return option?.title || searchType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get the placeholder text for a search type
 */
export function getSearchTypePlaceholder(searchType: SearchType): string {
  const displayName = getSearchTypeDisplayName(searchType);
  return `Start typing to search ${displayName.toLowerCase()}...`;
}
