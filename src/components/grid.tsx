import { Grid } from "@raycast/api";

interface GridItemProps {
  key: string;
  title: string;
  subtitle?: string;
  content?: Grid.Item.Props["content"];
  accessory?: Grid.Item.Accessory;
  actions?: Grid.Item.Props["actions"];
}

interface GridResultsProps {
  items: GridItemProps[];
  isLoading?: boolean;
}

export function GridResults(props: GridResultsProps) {
  return (
    <Grid.Section title="Results">
      {props.items.map((item) => (
        <Grid.Item
          key={item.key}
          title={item.title}
          subtitle={item.subtitle}
          content={item.content || ""}
          accessory={item.accessory}
          actions={item.actions}
        />
      ))}
    </Grid.Section>
  );
}

export default GridResults;
