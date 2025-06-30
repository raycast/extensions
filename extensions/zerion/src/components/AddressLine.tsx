import { usePromise } from "@raycast/utils";
import { WalletMetadata } from "../shared/types";
import { useMemo } from "react";
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
import { useWalletMetadata } from "../shared/useWalletMetadata";
import { useWalletPortfolio } from "../shared/useWalletPortfolio";
import { normalizeAddress } from "../shared/NormalizedAddress";

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
  walletMetadata,
  action,
  onChangeSavedStatus,
}: {
  address: string;
  walletMetadata?: WalletMetadata;
  action?: React.ReactNode;
  onChangeSavedStatus(): void;
}) {
  const normalizedAddress = normalizeAddress(address);
  const { data: menuBarAddress, revalidate: revalidateMenuBarAddress } = usePromise(getMenuBarAddress);

  const { portfolio, isLoading: portfolioIsLoading } = useWalletPortfolio({ address: normalizedAddress });

  const keywords = useMemo(
    () =>
      [
        normalizedAddress,
        walletMetadata?.membership.premium ? "Premium" : "",
        ...(walletMetadata?.identities.map((item) => item.handle) || []),
      ].filter(Boolean),
    [walletMetadata],
  );

  const truncatedAddress = middleTruncate({ value: normalizedAddress, leadingLettersCount: 5 });

  if (portfolioIsLoading || !walletMetadata) {
    return <List.Item icon={Icon.Wallet} title={truncatedAddress} />;
  }

  const name = walletMetadata.identities[0]?.handle;

  return (
    <List.Item
      icon={{
        source: walletMetadata.nft?.metadata?.content?.imagePreviewUrl || Icon.Wallet,
        mask: Image.Mask.RoundedRectangle,
      }}
      keywords={keywords}
      title={name || truncatedAddress}
      subtitle={name ? truncatedAddress : undefined}
      accessories={[
        {
          tag: { value: `Level ${walletMetadata.membership.level}`, color: Color.Magenta },
          tooltip: "Rewards Level",
        },
        walletMetadata.membership.premium
          ? {
              icon: { source: Icon.StarCircle, mask: Image.Mask.RoundedRectangle, tintColor: Color.Purple },
              tooltip: "Premium",
            }
          : {},
        ...walletMetadata.identities.slice(1).map((identity) => ({
          tag: { value: identity.handle },
        })),
        { text: { value: `$${Number(portfolio?.totalValue)?.toFixed(2)}` || "" } },
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
              title="Remove From Menu Bar"
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
        </ActionPanel>
      }
    />
  );
}

export function AddressLineByAddress({
  address,
  action,
  onChangeSavedStatus,
}: {
  address: string;
  action?: React.ReactNode;
  onChangeSavedStatus(): void;
}) {
  const { walletMetadata } = useWalletMetadata(address);
  return (
    <AddressLine
      address={address}
      walletMetadata={walletMetadata}
      action={action}
      onChangeSavedStatus={onChangeSavedStatus}
    />
  );
}
