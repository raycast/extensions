import {
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
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

type MenuBarPercentage =
  | "5h-used"
  | "5h-remaining"
  | "weekly-used"
  | "weekly-remaining";

const MENU_BAR_PERCENTAGE_KEY = "menu-bar-percentage";

export default function Command() {
  const initialSnapshot = useMemo(() => readCachedSnapshot(), []);
  const [menuBarPercentage, setMenuBarPercentage] =
    useCachedState<MenuBarPercentage>(MENU_BAR_PERCENTAGE_KEY, "5h-used");
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

  const updateMenuBarPercentage = useCallback(
    (value: MenuBarPercentage) => {
      setMenuBarPercentage(value);
    },
    [setMenuBarPercentage],
  );

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={getMenuBarTitle(snapshot, failure, menuBarPercentage)}
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
        <MenuBarExtra.Item
          title="Menu Bar Display"
          subtitle={formatMenuBarPreference(menuBarPercentage)}
          icon={Icon.AppWindow}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={() => void refresh(true)}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="ZenMux Console">
        <MenuBarExtra.Item
          title="Open Subscription Console"
          icon={Icon.CreditCard}
          onAction={() => void open("https://zenmux.ai/platform/subscription")}
        />
        <MenuBarExtra.Item
          title="Open PAYG Console"
          icon={Icon.Wallet}
          onAction={() => void open("https://zenmux.ai/platform/pay-as-you-go")}
        />
        <MenuBarExtra.Item
          title="Open Logs Console"
          icon={Icon.List}
          onAction={() => void open("https://zenmux.ai/platform/logs")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Settings">
        <MenuBarExtra.Submenu title="Menu Bar Display" icon={Icon.Gear}>
          <MenuBarDisplayItem
            title="5-hour Used"
            value="5h-used"
            selectedValue={menuBarPercentage}
            onSelect={updateMenuBarPercentage}
          />
          <MenuBarDisplayItem
            title="5-hour Remaining"
            value="5h-remaining"
            selectedValue={menuBarPercentage}
            onSelect={updateMenuBarPercentage}
          />
          <MenuBarDisplayItem
            title="Weekly Used"
            value="weekly-used"
            selectedValue={menuBarPercentage}
            onSelect={updateMenuBarPercentage}
          />
          <MenuBarDisplayItem
            title="Weekly Remaining"
            value="weekly-remaining"
            selectedValue={menuBarPercentage}
            onSelect={updateMenuBarPercentage}
          />
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item
          title="Configure Platform API Key"
          icon={Icon.Key}
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

function MenuBarDisplayItem(props: {
  title: string;
  value: MenuBarPercentage;
  selectedValue: MenuBarPercentage;
  onSelect: (value: MenuBarPercentage) => void;
}) {
  const isSelected = props.value === props.selectedValue;

  return (
    <MenuBarExtra.Item
      title={props.title}
      subtitle={isSelected ? "Selected" : undefined}
      icon={isSelected ? Icon.CheckCircle : Icon.Circle}
      onAction={() => void props.onSelect(props.value)}
    />
  );
}

function getMenuBarTitle(
  snapshot: AccountSnapshot | undefined,
  failure: string | undefined,
  menuBarPercentage: MenuBarPercentage,
): string {
  if (failure && !snapshot) {
    return "ZenMux error";
  }

  if (!snapshot) {
    return "ZenMux";
  }

  const metric = getMenuBarMetric(snapshot, menuBarPercentage);
  const balance = formatCurrency(
    snapshot.payg?.total_credits,
    snapshot.payg?.currency,
  );

  return `${metric.label} ${formatPercentage(metric.value)} ${metric.kind} · ${balance}`;
}

function getMenuBarMetric(
  snapshot: AccountSnapshot,
  metric: MenuBarPercentage,
): { label: string; value?: number; kind: "used" | "left" } {
  const fiveHourUsage = snapshot.subscription?.quota_5_hour
    ? getUsagePercentage(snapshot.subscription.quota_5_hour)
    : undefined;
  const weeklyUsage = snapshot.subscription?.quota_7_day
    ? getUsagePercentage(snapshot.subscription.quota_7_day)
    : undefined;

  switch (metric) {
    case "5h-remaining":
      return {
        label: "5h",
        value: getRemainingPercentage(fiveHourUsage),
        kind: "left",
      };
    case "weekly-used":
      return { label: "7d", value: weeklyUsage, kind: "used" };
    case "weekly-remaining":
      return {
        label: "7d",
        value: getRemainingPercentage(weeklyUsage),
        kind: "left",
      };
    case "5h-used":
    default:
      return { label: "5h", value: fiveHourUsage, kind: "used" };
  }
}

function getRemainingPercentage(value?: number): number | undefined {
  return typeof value === "number" ? 1 - value : undefined;
}

function formatMenuBarPreference(value: MenuBarPercentage): string {
  switch (value) {
    case "5h-remaining":
      return "5-hour Remaining";
    case "weekly-used":
      return "Weekly Used";
    case "weekly-remaining":
      return "Weekly Remaining";
    case "5h-used":
    default:
      return "5-hour Used";
  }
}
