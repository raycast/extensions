import React from "react";
import { Grid } from "@raycast/api";

/**
 * ActionPanel component type
 *
 * Using `any` here is intentional and necessary due to React type conflicts:
 * - Project uses @types/react@^19.1.4
 * - Raycast API uses @types/react@19.0.10
 * - These versions have incompatible ReactNode definitions
 * - ActionPanel JSX elements work correctly at runtime
 */
type ActionPanelComponent = any;

interface GridItemProps {
  key: string;
  title: string;
  subtitle?: string;
  content?: string;
  accessory?: Grid.Item.Accessory;
  actions?: ActionPanelComponent;
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
