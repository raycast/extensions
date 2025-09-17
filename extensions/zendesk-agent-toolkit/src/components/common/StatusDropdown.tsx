import React from "react";
import { Form } from "@raycast/api";

interface StatusDropdownProps {
  id?: string;
  title?: string;
  value: string;
  onChange: (value: string) => void;
  includeClosed?: boolean;
}

export function StatusDropdown({
  id = "status",
  title = "Status",
  value,
  onChange,
  includeClosed = true,
}: StatusDropdownProps) {
  return (
    <Form.Dropdown id={id} title={title} value={value} onChange={onChange}>
      <Form.Dropdown.Item value="new" title="New" />
      <Form.Dropdown.Item value="open" title="Open" />
      <Form.Dropdown.Item value="pending" title="Pending" />
      <Form.Dropdown.Item value="solved" title="Solved" />
      {includeClosed && <Form.Dropdown.Item value="closed" title="Closed" />}
    </Form.Dropdown>
  );
}
