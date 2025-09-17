import React from "react";
import { Action, ActionPanel } from "@raycast/api";

// Common ticket management actions
interface TicketManagementActionsProps {
  onAssignToMe: () => void;
  onMarkAsSolved: () => void;
  onMarkAsPending: () => void;
  onOpenInBrowser: () => void;
  onManageTicket: React.ReactNode;
  onApplyMacro: React.ReactNode;
  onConvertToArticle: React.ReactNode;
}

export function TicketManagementActions({
  onAssignToMe,
  onMarkAsSolved,
  onMarkAsPending,
  onOpenInBrowser,
  onManageTicket,
  onApplyMacro,
  onConvertToArticle,
}: TicketManagementActionsProps) {
  return (
    <>
      <ActionPanel.Section title="Ticket Actions">
        <Action.Push title="View Details" target={onManageTicket} />
        <Action title="Open in Browser" onAction={onOpenInBrowser} />
        <Action.Push title="Manage Ticket" target={onManageTicket} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Quick Actions">
        <Action.Push title="Apply Macro" icon="⚡" target={onApplyMacro} shortcut={{ modifiers: ["cmd"], key: "m" }} />
        <Action.Push
          title="Convert to Article"
          icon="📄"
          target={onConvertToArticle}
          shortcut={{ modifiers: ["cmd"], key: "a" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Status">
        <Action title="Assign to Me" icon="👤" onAction={onAssignToMe} />
        <Action title="Mark as Solved" icon="✅" onAction={onMarkAsSolved} />
        <Action title="Mark as Pending" icon="⏳" onAction={onMarkAsPending} />
      </ActionPanel.Section>
    </>
  );
}

// Common article management actions
interface ArticleManagementActionsProps {
  articleId: number;
  articleTitle: string;
  htmlUrl: string;
  onEdit: React.ReactNode;
  onPromote?: (id: number, title: string) => Promise<void>;
  onArchive?: (id: number, title: string) => Promise<void>;
  additionalActions?: React.ReactNode;
}

export function ArticleManagementActions({
  articleId,
  articleTitle,
  htmlUrl,
  onEdit,
  onPromote,
  onArchive,
  additionalActions,
}: ArticleManagementActionsProps) {
  return (
    <>
      <ActionPanel.Section title="Article Actions">
        <Action.Push title="Edit Article" target={onEdit} />
        <Action.OpenInBrowser url={htmlUrl} />
      </ActionPanel.Section>

      {onPromote && (
        <ActionPanel.Section title="Publishing">
          <Action title="Promote Article" icon="⭐" onAction={() => onPromote(articleId, articleTitle)} />
        </ActionPanel.Section>
      )}

      {onArchive && (
        <ActionPanel.Section title="Archiving">
          <Action title="Archive Article" icon="📦" onAction={() => onArchive(articleId, articleTitle)} />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Utilities">
        <Action.CopyToClipboard title="Copy Article URL" content={htmlUrl} />
        {additionalActions}
      </ActionPanel.Section>
    </>
  );
}

// Common macro management actions
interface MacroManagementActionsProps {
  macro: { id: number; title: string };
  ticketId?: number;
  onViewDetails: React.ReactNode;
  onPreviewChanges?: React.ReactNode;
  onApplyToTicket?: (macroId: number, macroTitle: string) => void;
  onCreateNew: React.ReactNode;
  onAISuggestions: React.ReactNode;
}

export function MacroManagementActions({
  macro,
  ticketId,
  onViewDetails,
  onPreviewChanges,
  onApplyToTicket,
  onCreateNew,
  onAISuggestions,
}: MacroManagementActionsProps) {
  return (
    <>
      <ActionPanel.Section title="Macro Actions">
        {ticketId && onApplyToTicket && (
          <Action
            title={`Apply to Ticket #${ticketId}`}
            icon="⚡"
            onAction={() => onApplyToTicket(macro.id, macro.title)}
          />
        )}
        <Action.Push title="View Details" target={onViewDetails} />
        {ticketId && onPreviewChanges && <Action.Push title="Preview Changes" target={onPreviewChanges} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Management">
        <Action.Push title="Create New Macro" target={onCreateNew} />
        <Action.Push
          title="AI Suggestions"
          icon="🤖"
          target={onAISuggestions}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel.Section>
    </>
  );
}
