import React from "react";
import { Form } from "@raycast/api";

interface PriorityDropdownProps {
  id?: string;
  title?: string;
  value: string;
  onChange: (value: string) => void;
}

export function PriorityDropdown({ id = "priority", title = "Priority", value, onChange }: PriorityDropdownProps) {
  return (
    <Form.Dropdown id={id} title={title} value={value} onChange={onChange}>
      <Form.Dropdown.Item value="low" title="Low" />
      <Form.Dropdown.Item value="normal" title="Normal" />
      <Form.Dropdown.Item value="high" title="High" />
      <Form.Dropdown.Item value="urgent" title="Urgent" />
    </Form.Dropdown>
  );
}
