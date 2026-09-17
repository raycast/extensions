import { List } from "@raycast/api";
import type { CollectionOption } from "./collections";

export default function CollectionDropdown(props: {
  options: CollectionOption[];
  value: string;
  onSelection: (newValue: string) => void;
}) {
  const { onSelection, options, value } = props;
  return (
    <List.Dropdown
      tooltip="Select Collection"
      value={value}
      onChange={(newValue) => {
        onSelection(newValue);
      }}
    >
      <List.Dropdown.Item key="All" title="All" value="All" />
      {options.map((opt) => (
        <List.Dropdown.Item key={opt.key} title={opt.title} value={opt.key} />
      ))}
    </List.Dropdown>
  );
}
