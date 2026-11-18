import { usePromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import {
  Icon,
  List,
  Image,
  Color,
  ActionPanel,
  Action,
  showHUD,
  PopToRootType,
  confirmAlert,
  Alert,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import {
  addAddress,
  getAddresses,
  getMenuBarAddress,
  middleTruncate,
  removeAddress,
  removeMenuBarAddress,
  setMenuBarAddress,
} from "../shared/utils";
import { useWalletIdentity, type WalletIdentity } from "../shared/useWalletIdentity";
import { useWalletPortfolio } from "../shared/useWalletPortfolio";
import { normalizeAddress } from "../shared/NormalizedAddress";
import { PerformanceView } from "./PerformanceView";
import { useWalletChart } from "../shared/useWalletChart";
import { DEFAULT_PERIOD } from "../shared/periods";
import { renderSparkline } from "../shared/performanceChart";

export function SafeAddressActions({
  address,
  onChangeSavedStatus,
}: {
  address: string;
  onChangeSavedStatus?: () => void;
}) {
  const normalizedAddress = normalizeAddress(address);
  const { data: addresses, isLoading: isSavedDataLoading, revalidate } = usePromise(getAddresses);

  return isSavedDataLoading ? null : addresses?.includes(normalizedAddress) ? (
    <Action
      icon={Icon.Trash}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Remove Wallet",
            message: `Address: ${middleTruncate({ value: normalizedAddress, leadingLettersCount: 5 })}`,
            primaryAction: { style: Alert.ActionStyle.Destructive, title: "Remove" },
          })
        ) {
          await removeAddress(normalizedAddress);
          revalidate();
          onChangeSavedStatus?.();
          showHUD("Removed Address From Saved", { popToRootType: PopToRootType.Default });
        }
      }}
      style={Action.Style.Destructive}
      title="Remove Wallet"
    />
  ) : (
    <Action
      icon={Icon.Center}
      onAction={() =>
        addAddress(normalizedAddress).then(() => {
          revalidate();
          onChangeSavedStatus?.();
          showHUD("Address Saved", { popToRootType: PopToRootType.Default });
        })
      }
      title="Save Wallet"
    />
  );
}

export function AddressLine({
  address,
  identity,
  action,
  onChangeSavedStatus,
  onApiError,
}: {
  address: string;
  identity?: WalletIdentity;
  action?: React.ReactNode;
  onChangeSavedStatus(): void;
  /** Lets list views without their own API requests (My Wallets) show the auth/quota gate. */
  onApiError?(error: unknown): void;
}) {
  const normalizedAddress = normalizeAddress(address);
  const { data: menuBarAddress, revalidate: revalidateMenuBarAddress } = usePromise(getMenuBarAddress);

  const { portfolio, isLoading: portfolioIsLoading, error } = useWalletPortfolio({ address: normalizedAddress });

  useEffect(() => {
    if (error) {
      onApiError?.(error);
    }
  }, [error]);

  // Only fetched on rows that show the sparkline hint; shares the cache with Performance's default Period
  const { chart } = useWalletChart({ address: action ? undefined : normalizedAddress, period: DEFAULT_PERIOD });
  const performanceIcon = useMemo(() => {
    const light = chart && renderSparkline({ theme: "light", points: chart.points });
    const dark = chart && renderSparkline({ theme: "dark", points: chart.points });
    return light && dark ? { source: { light, dark } } : Icon.LineChart;
  }, [chart]);

  const keywords = useMemo(() => [normalizedAddress, identity?.ens].filter(Boolean) as string[], [identity]);

  const truncatedAddress = middleTruncate({ value: normalizedAddress, leadingLettersCount: 5 });

  if (portfolioIsLoading) {
    return <List.Item icon={Icon.Wallet} title={truncatedAddress} />;
  }

  const name = identity?.ens;

  return (
    <List.Item
      icon={{
        source: identity?.avatarUrl || Icon.Wallet,
        mask: Image.Mask.RoundedRectangle,
      }}
      keywords={keywords}
      title={name || truncatedAddress}
      subtitle={name ? truncatedAddress : undefined}
      accessories={[
        { text: { value: `$${Number(portfolio?.totalValue ?? 0).toFixed(2)}` } },
        {
          text: {
            value: portfolio?.totalValue
              ? `${portfolio?.change24h.relative.toFixed()}% ($${Math.abs(portfolio?.change24h.absolute || 0).toFixed(2)})`
              : "0% ($0.00)",
            color: !portfolio?.change24h?.relative
              ? Color.SecondaryText
              : portfolio?.change24h.relative > 0
                ? Color.Green
                : Color.Red,
          },
        },
        // Rows without a custom primary action get a 1D sparkline hinting at Performance
        ...(action ? [] : [{ icon: performanceIcon, tooltip: "Press ⌘⇧P to show Performance" }]),
      ]}
      actions={
        <ActionPanel title="Actions">
          {action}
          <Action.OpenInBrowser
            url={`https://app.zerion.io/${normalizedAddress}`}
            title="Open in Zerion Web App"
            icon={Icon.Globe}
          />
          {menuBarAddress === normalizedAddress ? (
            <Action
              icon={Icon.LivestreamDisabled}
              onAction={() =>
                removeMenuBarAddress().then(() => {
                  revalidateMenuBarAddress();
                  launchCommand({ name: "menu-bar-wallet", type: LaunchType.UserInitiated });
                })
              }
              style={Action.Style.Destructive}
              title="Remove from Menu Bar"
            />
          ) : (
            <Action
              icon={Icon.LevelMeter}
              onAction={() =>
                setMenuBarAddress(normalizedAddress).then(() => {
                  revalidateMenuBarAddress();
                  launchCommand({ name: "menu-bar-wallet", type: LaunchType.UserInitiated });
                })
              }
              title="Select for Menu Bar"
            />
          )}
          <SafeAddressActions address={normalizedAddress} onChangeSavedStatus={onChangeSavedStatus} />
          <Action.Push
            title="Show Performance"
            icon={Icon.LineChart}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            target={<PerformanceView address={normalizedAddress} name={name} />}
          />
        </ActionPanel>
      }
    />
  );
}

export function AddressLineByAddress({
  address,
  action,
  onChangeSavedStatus,
  onApiError,
}: {
  address: string;
  action?: React.ReactNode;
  onChangeSavedStatus(): void;
  onApiError?(error: unknown): void;
}) {
  const { identity } = useWalletIdentity(address);
  return (
    <AddressLine
      address={address}
      identity={identity}
      action={action}
      onChangeSavedStatus={onChangeSavedStatus}
      onApiError={onApiError}
    />
  );
}
