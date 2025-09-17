import React from "react";
import { List, Detail, Form, ActionPanel, Action } from "@raycast/api";

// Loading States
interface LoadingStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

export function LoadingState({
  title = "Loading...",
  message = "Please wait while we fetch your data",
  icon = "⏳",
}: LoadingStateProps) {
  return (
    <Detail
      markdown={`# ${icon} ${title}\n\n${message}`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={() => window.location.reload()} />
        </ActionPanel>
      }
    />
  );
}

export function LoadingList({
  title = "Loading...",
  message = "Please wait while we fetch your data",
}: LoadingStateProps) {
  return (
    <List isLoading={true}>
      <List.EmptyView title={title} description={message} />
    </List>
  );
}

export function LoadingForm({
  title = "Loading...",
  message = "Please wait while we prepare the form",
}: LoadingStateProps) {
  return (
    <Form isLoading={true}>
      <Form.Description title={title} text={message} />
    </Form>
  );
}

// Empty States
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actions?: React.ReactNode;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = "📭",
  actions,
  showRefresh = true,
  onRefresh,
}: EmptyStateProps) {
  return (
    <Detail
      markdown={`# ${icon} ${title}\n\n${description}`}
      actions={
        <ActionPanel>
          {actions}
          {showRefresh && <Action title="Refresh" icon="🔄" onAction={onRefresh || (() => window.location.reload())} />}
        </ActionPanel>
      }
    />
  );
}

export function EmptyList({
  title,
  description,
  icon = "📭",
  actions,
  showRefresh = true,
  onRefresh,
}: EmptyStateProps) {
  return (
    <List>
      <List.EmptyView
        title={title}
        description={description}
        icon={icon}
        actions={
          <ActionPanel>
            {actions}
            {showRefresh && (
              <Action title="Refresh" icon="🔄" onAction={onRefresh || (() => window.location.reload())} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}

// Specific Empty States
export function NoTicketsEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyList
      title="No Tickets Found"
      description="You don't have any tickets matching your current filters. Try adjusting your search criteria or check if you have any assigned tickets."
      icon="🎫"
      showRefresh={true}
      onRefresh={onRefresh}
    />
  );
}

export function NoMacrosEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyList
      title="No Macros Available"
      description="You haven't created any macros yet. Create your first macro to speed up common ticket actions."
      icon="⚡"
      showRefresh={true}
      onRefresh={onRefresh}
      actions={
        <ActionPanel>
          <Action.Push title="Create First Macro" icon="➕" target={<div>Create Macro Form</div>} />
        </ActionPanel>
      }
    />
  );
}

export function NoArticlesEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyList
      title="No Articles Found"
      description="No Help Center articles match your search criteria. Try different keywords or browse categories."
      icon="📄"
      showRefresh={true}
      onRefresh={onRefresh}
    />
  );
}

export function NoAISuggestionsEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyList
      title="No AI Suggestions Yet"
      description="AI macro suggestions will appear here after you resolve similar tickets. Keep resolving tickets to build patterns!"
      icon="🤖"
      showRefresh={true}
      onRefresh={onRefresh}
    />
  );
}

// Loading with Progress
interface LoadingWithProgressProps {
  title: string;
  current: number;
  total: number;
  message?: string;
}

export function LoadingWithProgress({ title, current, total, message }: LoadingWithProgressProps) {
  const percentage = Math.round((current / total) * 100);
  const progressBar = "█".repeat(Math.floor(percentage / 10)) + "░".repeat(10 - Math.floor(percentage / 10));

  return (
    <Detail
      markdown={`# ${title}\n\n**Progress:** ${current}/${total} (${percentage}%)\n\n\`${progressBar}\`\n\n${message || "Processing items..."}`}
      actions={
        <ActionPanel>
          <Action title="Cancel" icon="❌" onAction={() => window.location.reload()} />
        </ActionPanel>
      }
    />
  );
}

// Skeleton Loading
interface SkeletonItemProps {
  title?: string;
  subtitle?: string;
  accessory?: string;
}

export function SkeletonItem({ title = "Loading...", subtitle = "Please wait", accessory = "⏳" }: SkeletonItemProps) {
  return <List.Item title={title} subtitle={subtitle} accessories={[{ text: accessory }]} icon="⏳" />;
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <List>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem title={`Loading item ${i + 1}...`} subtitle="Please wait while we fetch your data" />
      ))}
    </List>
  );
}
