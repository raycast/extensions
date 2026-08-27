import { List } from "@raycast/api";
export default function CollectionDropdown(props: {
  collections: string[];
  value: string;
  onSelection: (newValue: string) => void;
}) {
  const { onSelection, collections, value } = props;
  return (
    <List.Dropdown
      tooltip="Select Collection"
      value={value}
      onChange={(newValue) => {
        onSelection(newValue);
      }}
    >
      <List.Dropdown.Item key="All" title="All" value="All" />
      {collections.map((col) => (
        <List.Dropdown.Item key={col} title={col} value={col} />
      ))}
    </List.Dropdown>
  );
}
