import { ReactNode } from "react";

declare module "@raycast/api" {
  interface ListProps {
    children?: ReactNode;
    navigationTitle?: string;
    searchBarPlaceholder?: string;
    isLoading?: boolean;
  }
  
  interface ListSectionProps {
    children?: ReactNode;
    title?: string;
  }
  
  interface ListItemProps {
    children?: ReactNode;
    title: string;
    subtitle?: string;
    icon?: any;
    accessories?: Array<{ text: string }>;
    actions?: ReactNode;
  }
  
  interface ActionPanelProps {
    children?: ReactNode;
  }
  
  interface ActionProps {
    title: string;
    icon?: any;
    onAction?: () => void;
    shortcut?: { modifiers: string[]; key: string };
  }
  
  interface EmptyViewProps {
    title: string;
    description?: string;
    icon?: any;
  }
}