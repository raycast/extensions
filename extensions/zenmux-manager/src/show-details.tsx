import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccountSnapshot,
  QuotaWindow,
  cacheSnapshot,
  fetchAccountSnapshot,
  formatCurrency,
  formatDateTime,
  formatFlows,
  formatPercentage,
  formatPlan,
  formatRelativeDuration,
  formatStatus,
  getErrorMessage,
  getStatusColor,
  getUsageColor,
  getUsagePercentage,
  hasSubscriptionData,
  readCachedSnapshot,
} from "./zenmux";

export default function Command() {
  const initialSnapshot = useMemo(() => readCachedSnapshot(), []);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | undefined>(initialSnapshot);
  const [failure, setFailure] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(!initialSnapshot);

  const refresh = useCallback(async (showSuccessToast = false) => {
    setIsLoading(true);
    setFailure(undefined);

    try {
      const nextSnapshot = await fetchAccountSnapshot();
      cacheSnapshot(nextSnapshot);
      setSnapshot(nextSnapshot);

      if (showSuccessToast) {
        await showToast({
          style: Toast.Style.Success,
          title: "ZenMux usage refreshed",
        });
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setFailure(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh ZenMux usage",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const showSubscription = hasSubscriptionData(snapshot?.subscription);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ZenMux usage" navigationTitle="ZenMux Usage">
      {failure ? (
        <List.Section title="Refresh Error">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Could not refresh ZenMux usage"
            subtitle={failure}
            actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
          />
        </List.Section>
      ) : null}

      {snapshot?.warnings.length ? (
        <List.Section title="Partial Data">
          {snapshot.warnings.map((warning) => (
            <List.Item
              key={warning.title}
              icon={{ source: Icon.Exclamationmark, tintColor: Color.Yellow }}
              title={warning.title}
              subtitle={warning.message}
              actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Overview">
        {showSubscription ? (
          <List.Item
            icon={Icon.Gauge}
            title="Plan"
            subtitle={formatPlan(snapshot?.subscription?.plan)}
            accessories={[
              {
                tag: {
                  value: formatStatus(snapshot?.subscription?.account_status),
                  color: getStatusColor(snapshot?.subscription?.account_status),
                },
              },
            ]}
            actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
          />
        ) : null}
        <List.Item
          icon={Icon.Wallet}
          title="PAYG Balance"
          subtitle={`Top-up ${formatCurrency(snapshot?.payg?.top_up_credits, snapshot?.payg?.currency)} · Bonus ${formatCurrency(
            snapshot?.payg?.bonus_credits,
            snapshot?.payg?.currency,
          )}`}
          accessories={[
            {
              text: {
                value: formatCurrency(snapshot?.payg?.total_credits, snapshot?.payg?.currency),
                color: Color.PrimaryText,
              },
            },
          ]}
          actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
        />
        {showSubscription ? (
          <List.Item
            icon={Icon.Coin}
            title="Flow Rate"
            subtitle="Effective USD value per Flow"
            accessories={[
              {
                text: `${formatCurrency(snapshot?.subscription?.effective_usd_per_flow, snapshot?.subscription?.currency)}/Flow`,
              },
            ]}
            actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
          />
        ) : null}
      </List.Section>

      {showSubscription ? (
        <List.Section title="Subscription Quota">
          {buildQuotaItem("5-hour Quota", snapshot?.subscription?.quota_5_hour, snapshot, () => void refresh(true))}
          {buildQuotaItem("7-day Quota", snapshot?.subscription?.quota_7_day, snapshot, () => void refresh(true))}
          <List.Item
            icon={Icon.Calendar}
            title="Monthly Quota"
            subtitle="Billing cycle cap"
            accessories={[
              {
                text: formatFlows(snapshot?.subscription?.quota_monthly?.max_flows),
              },
              {
                text: formatCurrency(
                  snapshot?.subscription?.quota_monthly?.max_value_usd,
                  snapshot?.subscription?.currency,
                ),
              },
            ]}
            actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
          />
        </List.Section>
      ) : null}

      <List.Section title="Account">
        {showSubscription ? (
          <List.Item
            icon={Icon.Clock}
            title="Subscription Expires"
            subtitle={formatDateTime(snapshot?.subscription?.plan?.expires_at)}
            actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
          />
        ) : null}
        <List.Item
          icon={Icon.ArrowClockwise}
          title="Last Updated"
          subtitle={snapshot ? formatDateTime(snapshot.fetchedAt) : "Never"}
          actions={<UsageActions snapshot={snapshot} onRefresh={() => void refresh(true)} />}
        />
      </List.Section>

      <List.Section title="ZenMux Links">
        {showSubscription ? (
          <ConsoleLinkItem
            title="Subscription Console"
            icon={Icon.CreditCard}
            url="https://zenmux.ai/platform/subscription"
            snapshot={snapshot}
            onRefresh={() => void refresh(true)}
          />
        ) : null}
        <ConsoleLinkItem
          title="PAYG Console"
          icon={Icon.Wallet}
          url="https://zenmux.ai/platform/pay-as-you-go"
          snapshot={snapshot}
          onRefresh={() => void refresh(true)}
        />
        <ConsoleLinkItem
          title="Logs Console"
          icon={Icon.List}
          url="https://zenmux.ai/platform/logs"
          snapshot={snapshot}
          onRefresh={() => void refresh(true)}
        />
        <ConsoleLinkItem
          title="Platform API Key"
          icon={Icon.Key}
          url="https://zenmux.ai/platform/management"
          snapshot={snapshot}
          onRefresh={() => void refresh(true)}
        />
      </List.Section>
    </List>
  );
}

function buildQuotaItem(
  title: string,
  quota: QuotaWindow | undefined,
  snapshot: AccountSnapshot | undefined,
  onRefresh: () => void,
) {
  const usage = quota ? getUsagePercentage(quota) : undefined;
  const color = getUsageColor(usage);
  const remaining = typeof usage === "number" ? 1 - usage : undefined;

  return (
    <List.Item
      key={title}
      icon={quota ? getProgressIcon(usage ?? 0, color) : Icon.CircleDisabled}
      title={title}
      subtitle={`Resets in ${formatRelativeDuration(quota?.resets_at)}`}
      accessories={[
        {
          tag: {
            value: `${formatPercentage(remaining)} left`,
            color,
          },
        },
        {
          tag: {
            value: `${formatPercentage(usage)} used`,
            color,
          },
        },
      ]}
      actions={<UsageActions snapshot={snapshot} onRefresh={onRefresh} />}
    />
  );
}

function ConsoleLinkItem(props: {
  title: string;
  url: string;
  icon: Icon;
  snapshot?: AccountSnapshot;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      icon={props.icon}
      title={props.title}
      subtitle={props.url}
      accessories={[{ icon: Icon.ArrowNe }]}
      actions={
        <UsageActions
          snapshot={props.snapshot}
          onRefresh={props.onRefresh}
          primaryUrl={props.url}
          primaryTitle={`Open ${props.title}`}
        />
      }
    />
  );
}

function UsageActions(props: {
  snapshot?: AccountSnapshot;
  onRefresh: () => void;
  primaryUrl?: string;
  primaryTitle?: string;
}) {
  return (
    <ActionPanel>
      {props.primaryUrl ? <Action.OpenInBrowser title={props.primaryTitle} url={props.primaryUrl} /> : null}
      <ActionPanel.Section title="Actions">
        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={props.onRefresh} />
        <Action.CopyToClipboard
          title="Copy Snapshot JSON"
          icon={Icon.CopyClipboard}
          content={JSON.stringify(props.snapshot ?? {}, null, 2)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="ZenMux Console">
        {hasSubscriptionData(props.snapshot?.subscription) ? (
          <Action.OpenInBrowser
            title="Open Subscription Console"
            icon={Icon.CreditCard}
            url="https://zenmux.ai/platform/subscription"
          />
        ) : null}
        <Action.OpenInBrowser
          title="Open PAYG Console"
          icon={Icon.Wallet}
          url="https://zenmux.ai/platform/pay-as-you-go"
        />
        <Action.OpenInBrowser title="Open Logs Console" icon={Icon.List} url="https://zenmux.ai/platform/logs" />
        <Action.OpenInBrowser
          title="Open Platform API Console"
          icon={Icon.Key}
          url="https://zenmux.ai/platform/management"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Settings">
        <Action title="Configure Platform API Key" icon={Icon.Gear} onAction={() => void openExtensionPreferences()} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
