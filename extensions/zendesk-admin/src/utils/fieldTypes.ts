import { Color } from "@raycast/api";

export interface FieldTypeInfo {
  label: string;
  color: string;
}

export const fieldTypeMapping: { [key: string]: FieldTypeInfo } = {
  text: { label: "Text", color: "#00796B" }, // Teal
  textarea: { label: "Textarea", color: "Green" },
  checkbox: { label: "Checkbox", color: "#FF9800" }, // Orange
  date: { label: "Date", color: "Orange" },
  integer: { label: "Integer", color: "#3F51B5" }, // Indigo
  decimal: { label: "Decimal", color: "Red" },
  regexp: { label: "Regex", color: "Yellow" },
  partialcreditcard: { label: "Partial Credit Card", color: "PrimaryText" },
  multiselect: { label: "Multi-select", color: "#9C27B0" }, // Purple
  tagger: { label: "Dropdown", color: "#1E90FF" }, // Dodger Blue
  lookup: { label: "Lookup", color: "#8A2BE2" }, // Blue Violet
  group: { label: "System", color: "Gray" },
  tickettype: { label: "System", color: "Gray" },
  subject: { label: "System", color: "Gray" },
  status: { label: "System", color: "Gray" },
  description: { label: "System", color: "Gray" },
  assignee: { label: "System", color: "Gray" },
  priority: { label: "System", color: "Gray" },
};

export const getFieldTypeInfo = (type: string): FieldTypeInfo => {
  return fieldTypeMapping[type] || { label: type || "Unknown Type", color: Color.PrimaryText };
};
