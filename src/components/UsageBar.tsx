import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { UsageData } from "../types";
import { formatPercentage, formatUsage, getStatusEmoji } from "../utils/formatters";

interface UsageBarProps {
  usage: UsageData;
  onRefresh?: () => void;
  onConfigure?: () => void;
}

export function UsageBarItem({ usage, onRefresh, onConfigure }: UsageBarProps) {
  const primaryRatio = usage.primary.usedRatio;
  const statusEmoji = getStatusEmoji(primaryRatio);

  // Create visual bar using block characters
  const filledBlocks = Math.round(primaryRatio * 10);
  const emptyBlocks = 10 - filledBlocks;
  const bar = "▓".repeat(filledBlocks) + "░".repeat(emptyBlocks);

  const subtitle = usage.reset
    ? `${formatUsage(usage.primary.used, usage.primary.limit)} • Resets in ${usage.reset.relativeTime}`
    : formatUsage(usage.primary.used, usage.primary.limit);

  return (
    <List.Item
      title={`${statusEmoji} ${usage.provider}`}
      subtitle={subtitle}
      accessories={[
        {
          text: `${bar} ${formatPercentage(primaryRatio)}`,
          tooltip: `${usage.primary.remaining} remaining`,
        },
      ]}
      actions={
        <ActionPanel>
          {onRefresh && <Action title="Refresh" icon={Icon.RotateClockwise} onAction={onRefresh} />}
          {onConfigure && <Action title="Configure" icon={Icon.Gear} onAction={onConfigure} />}
        </ActionPanel>
      }
    />
  );
}

interface ProviderErrorItemProps {
  providerName: string;
  error: string;
  onConfigure: () => void;
}

export function ProviderErrorItem({ providerName, error, onConfigure }: ProviderErrorItemProps) {
  return (
    <List.Item
      title={`⚫ ${providerName}`}
      subtitle={error}
      accessories={[
        {
          text: "Not configured",
          tooltip: error,
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Configure Provider" icon={Icon.Gear} onAction={onConfigure} />
        </ActionPanel>
      }
    />
  );
}

interface ProviderLoadingItemProps {
  providerName: string;
}

export function ProviderLoadingItem({ providerName }: ProviderLoadingItemProps) {
  return <List.Item title={`⏳ ${providerName}`} subtitle="Loading..." />;
}
