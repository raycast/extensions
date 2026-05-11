import {
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
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
  formatProgressBar,
  formatRelativeDuration,
  getErrorMessage,
  getUsagePercentage,
  readCachedSnapshot,
} from "./zenmux";

export default function Command() {
  const initialSnapshot = useMemo(() => readCachedSnapshot(), []);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | undefined>(
    initialSnapshot,
  );
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

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={getMenuBarTitle(snapshot, failure)}
      tooltip="ZenMux quota and PAYG balance"
    >
      {failure ? (
        <MenuBarExtra.Item
          title="Refresh failed"
          subtitle={failure}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      ) : null}

      <MenuBarExtra.Section title="Overview">
        <MenuBarExtra.Item
          title="Plan"
          subtitle={formatPlan(snapshot?.subscription?.plan)}
          icon={Icon.Gauge}
        />
        <MenuBarExtra.Item
          title="PAYG Balance"
          subtitle={formatCurrency(
            snapshot?.payg?.total_credits,
            snapshot?.payg?.currency,
          )}
          icon={Icon.Wallet}
        />
      </MenuBarExtra.Section>

      <QuotaMenuSection
        title="5-hour Quota"
        quota={snapshot?.subscription?.quota_5_hour}
      />

      <QuotaMenuSection
        title="Weekly Quota"
        quota={snapshot?.subscription?.quota_7_day}
      />

      <MenuBarExtra.Section title="Monthly Quota">
        <MenuBarExtra.Item
          title="Cap"
          subtitle={formatFlows(
            snapshot?.subscription?.quota_monthly?.max_flows,
          )}
        />
        <MenuBarExtra.Item
          title="USD Value"
          subtitle={formatCurrency(
            snapshot?.subscription?.quota_monthly?.max_value_usd,
            snapshot?.subscription?.currency,
          )}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Details">
        <MenuBarExtra.Item
          title="Flow Rate"
          subtitle={`${formatCurrency(snapshot?.subscription?.effective_usd_per_flow, snapshot?.subscription?.currency)}/Flow`}
          icon={Icon.Coin}
        />
        <MenuBarExtra.Item
          title="Subscription Expires"
          subtitle={formatDateTime(snapshot?.subscription?.plan?.expires_at)}
          icon={Icon.Clock}
        />
        <MenuBarExtra.Item
          title="Last Updated"
          subtitle={snapshot ? formatDateTime(snapshot.fetchedAt) : "Never"}
          icon={Icon.ArrowClockwise}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={() => void refresh(true)}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <MenuBarExtra.Item
          title="Open Subscription Console"
          icon={Icon.Globe}
          onAction={() => void open("https://zenmux.ai/platform/subscription")}
        />
        <MenuBarExtra.Item
          title="Open PAYG Console"
          icon={Icon.Globe}
          onAction={() => void open("https://zenmux.ai/platform/pay-as-you-go")}
        />
        <MenuBarExtra.Item
          title="Configure Management API Key"
          icon={Icon.Gear}
          onAction={() => void openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function QuotaMenuSection(props: { title: string; quota?: QuotaWindow }) {
  const usage = props.quota ? getUsagePercentage(props.quota) : undefined;
  const remaining = typeof usage === "number" ? 1 - usage : undefined;

  return (
    <MenuBarExtra.Section title={props.title}>
      <MenuBarExtra.Item
        title="Remaining"
        subtitle={formatPercentage(remaining)}
      />
      <MenuBarExtra.Item
        title="Progress"
        subtitle={formatProgressBar(remaining)}
      />
      <MenuBarExtra.Item
        title="Resets In"
        subtitle={formatRelativeDuration(props.quota?.resets_at)}
      />
    </MenuBarExtra.Section>
  );
}

function getMenuBarTitle(snapshot?: AccountSnapshot, failure?: string): string {
  if (failure && !snapshot) {
    return "ZenMux error";
  }

  if (!snapshot) {
    return "ZenMux";
  }

  const fiveHourUsage = snapshot.subscription?.quota_5_hour
    ? getUsagePercentage(snapshot.subscription.quota_5_hour)
    : undefined;
  const balance = formatCurrency(
    snapshot.payg?.total_credits,
    snapshot.payg?.currency,
  );

  return `5h ${formatPercentage(fiveHourUsage)} · ${balance}`;
}
