import React from "react";
import { Action, Keyboard } from "@raycast/api";

// Common "View Details" action
interface ViewDetailsActionProps {
  title?: string;
  target: React.ReactNode;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function ViewDetailsAction({ title = "View Details", target, icon = "👁️", shortcut }: ViewDetailsActionProps) {
  return <Action.Push title={title} icon={icon} target={target} shortcut={shortcut} />;
}

// Common "Edit" action
interface EditActionProps {
  title?: string;
  target: React.ReactNode;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function EditAction({ title = "Edit", target, icon = "✏️", shortcut }: EditActionProps) {
  return <Action.Push title={title} icon={icon} target={target} shortcut={shortcut} />;
}

// Common "Open in Browser" action
interface OpenInBrowserActionProps {
  url: string;
  title?: string;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function OpenInBrowserAction({
  url,
  title = "Open in Browser",
  icon = "🌐",
  shortcut,
}: OpenInBrowserActionProps) {
  return <Action.OpenInBrowser url={url} title={title} icon={icon} shortcut={shortcut} />;
}

// Common "Copy to Clipboard" action
interface CopyToClipboardActionProps {
  content: string;
  title?: string;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function CopyToClipboardAction({
  content,
  title = "Copy to Clipboard",
  icon = "📋",
  shortcut,
}: CopyToClipboardActionProps) {
  return <Action.CopyToClipboard content={content} title={title} icon={icon} shortcut={shortcut} />;
}

// Common "Assign to Me" action
interface AssignToMeActionProps {
  onAction: () => void;
  title?: string;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function AssignToMeAction({ onAction, title = "Assign to Me", icon = "👤", shortcut }: AssignToMeActionProps) {
  return <Action title={title} icon={icon} onAction={onAction} shortcut={shortcut} />;
}

// Common "Mark as Solved" action
interface MarkAsSolvedActionProps {
  onAction: () => void;
  title?: string;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function MarkAsSolvedAction({
  onAction,
  title = "Mark as Solved",
  icon = "✅",
  shortcut,
}: MarkAsSolvedActionProps) {
  return <Action title={title} icon={icon} onAction={onAction} shortcut={shortcut} />;
}

// Common "Mark as Pending" action
interface MarkAsPendingActionProps {
  onAction: () => void;
  title?: string;
  icon?: string;
  shortcut?: Keyboard.Shortcut;
}

export function MarkAsPendingAction({
  onAction,
  title = "Mark as Pending",
  icon = "⏳",
  shortcut,
}: MarkAsPendingActionProps) {
  return <Action title={title} icon={icon} onAction={onAction} shortcut={shortcut} />;
}
