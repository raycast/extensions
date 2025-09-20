import { List } from "@raycast/api";
export default function CollectionDropdown(props: { collections: string[]; onSelection: (newValue: string) => void }) {
  const { onSelection, collections } = props;
  return (
    <List.Dropdown
      tooltip="Select Collection"
      storeValue={true}
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
