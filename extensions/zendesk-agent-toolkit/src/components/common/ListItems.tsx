import React from "react";
import { List } from "@raycast/api";

// Common interface for list item accessories
interface BaseAccessory {
  text?: string;
  icon?: string;
  tag?: { value: string; color: string };
  date?: Date;
}

// Common Ticket List Item
interface TicketListItemProps {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
  actions: any;
  subtitle?: string;
}

export function TicketListItem({ title, status, updatedAt, actions, subtitle }: TicketListItemProps) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ tag: status }, { date: new Date(updatedAt) }]}
      actions={actions}
    />
  );
}

// Common Article List Item
interface ArticleListItemProps {
  id: number;
  title: string;
  updatedAt: string;
  actions: any;
  draft?: boolean;
  archived?: boolean;
  promoted?: boolean;
  icon?: string;
}

export function ArticleListItem({
  title,
  updatedAt,
  actions,
  draft = false,
  archived = false,
  promoted = false,
  icon = "📄",
}: ArticleListItemProps) {
  const accessories: BaseAccessory[] = [
    ...(draft ? [{ tag: { value: "Draft", color: "#orange" } }] : []),
    ...(archived ? [{ tag: { value: "Archived", color: "#gray" } }] : []),
    ...(promoted ? [{ tag: { value: "Promoted", color: "#green" } }] : []),
    { date: new Date(updatedAt) },
  ];

  return <List.Item title={title} accessories={accessories} icon={icon} actions={actions} />;
}

// Common Macro List Item
interface MacroListItemProps {
  id: number;
  title: string;
  description?: string;
  actionsCount: number;
  updatedAt: string;
  actions: any;
}

export function MacroListItem({ title, description, actionsCount, updatedAt, actions }: MacroListItemProps) {
  return (
    <List.Item
      title={title}
      subtitle={description}
      accessories={[{ text: `${actionsCount} actions` }, { date: new Date(updatedAt) }]}
      actions={actions}
    />
  );
}

// Common Category/Section List Item
interface CategorySectionListItemProps {
  id: number;
  title: string;
  description?: string;
  icon: string;
  actions: any;
}

export function CategorySectionListItem({ title, description, icon, actions }: CategorySectionListItemProps) {
  return <List.Item title={title} subtitle={description} icon={icon} actions={actions} />;
}

// Common AI Suggestion List Item
interface AISuggestionListItemProps {
  index: number;
  title: string;
  description: string;
  confidence: number;
  actionsCount: number;
  actions: any;
}

export function AISuggestionListItem({
  title,
  description,
  confidence,
  actionsCount,
  actions,
}: AISuggestionListItemProps) {
  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  const getConfidenceIcon = (confidence: number): string => {
    if (confidence >= 0.8) return "🟢";
    if (confidence >= 0.6) return "🟡";
    return "🔴";
  };

  return (
    <List.Item
      title={title}
      subtitle={description}
      accessories={[
        {
          text: getConfidenceText(confidence),
          icon: getConfidenceIcon(confidence),
        },
        { text: `${actionsCount} actions` },
      ]}
      actions={actions}
    />
  );
}

// Generic List Item for flexible use
interface GenericListItemProps {
  id: string | number;
  title: string;
  subtitle?: string;
  icon?: string;
  accessories?: BaseAccessory[];
  actions: any;
}

export function GenericListItem({ title, subtitle, icon, accessories = [], actions }: GenericListItemProps) {
  return <List.Item title={title} subtitle={subtitle} icon={icon} accessories={accessories} actions={actions} />;
}
