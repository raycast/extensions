import { Icon, List, Image, Color, ActionPanel, Action, useNavigation } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useState } from "react";
import type { SearchAsset, SearchWallet } from "./shared/types";
import { useSearch } from "./shared/useSearch";
import { middleTruncate } from "./shared/utils";
import { AddressView } from "./components/AddressView";
import { SafeAddressActions } from "./components/AddressLine";
import { withAccessToken } from "@raycast/utils";
import { ApiErrorGate } from "./components/ApiKeyGate";
import { normalizeAddress } from "./shared/NormalizedAddress";
import { zerionOAuth } from "./shared/oauth";
import { TokenDetail } from "./components/TokenDetail";
import type { ReactNode } from "react";

function AssetLine({
  asset,
  isShowingDetail,
  isSelected,
  detailAction,
}: {
  asset: SearchAsset;
  isShowingDetail: boolean;
  isSelected: boolean;
  detailAction: ReactNode;
}) {
  const changeAccessory = {
    text: {
      value: `${asset.relativeChange1d ? asset.relativeChange1d.toFixed() : 0}%`,
      color: (asset.relativeChange1d || 0) >= 0 ? Color.Green : Color.Red,
    },
  };
  return (
    <List.Item
      id={`token:${asset.id}`}
      title={asset.name}
      icon={{ source: asset.iconUrl || Icon.Circle, mask: Image.Mask.Circle }}
      subtitle={asset.symbol}
      accessories={
        isShowingDetail
          ? [changeAccessory]
          : [{ text: { value: `$${asset.price ? Number(asset.price).toFixed(2) : "0.00"}` } }, changeAccessory]
      }
      detail={
        isShowingDetail ? (
          <TokenDetail
            token={{ id: asset.id, symbol: asset.symbol, price: asset.price, relativeChange1d: asset.relativeChange1d }}
            isActive={isSelected}
          />
        ) : undefined
      }
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser
            url={`https://app.zerion.io/tokens/${asset.id}`}
            title="Open in Zerion Web App"
            icon={Icon.Globe}
          />
          {detailAction}
        </ActionPanel>
      }
    />
  );
}

function WalletLine({ wallet }: { wallet: SearchWallet }) {
  const { push } = useNavigation();

  const normalizedAddress = normalizeAddress(wallet.address);
  const truncatedAddress = middleTruncate({ value: normalizedAddress });

  return (
    <List.Item
      icon={{ source: wallet.iconUrl || Icon.Wallet, mask: Image.Mask.RoundedRectangle }}
      title={wallet.name || truncatedAddress}
      subtitle={wallet.name ? truncatedAddress : undefined}
      actions={
        <ActionPanel title="Actions">
          <Action
            onAction={() => push(<AddressView addressOrDomain={normalizedAddress} />)}
            title="Go to Wallet"
            icon={Icon.Eye}
          />
          <Action.OpenInBrowser
            url={`https://app.zerion.io/${normalizedAddress}`}
            title="Open in Zerion Web App"
            icon={Icon.Globe}
          />
          <SafeAddressActions address={normalizedAddress} />
        </ActionPanel>
      }
    />
  );
}

function Command(props: LaunchProps) {
  const [query, setQuery] = useState(props.arguments.query);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  // Token Details only fetch for the selected row, so the list tracks it
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { tokens, wallets, isLoading, error } = useSearch(query);

  const errorGate = ApiErrorGate({ error });
  if (errorGate) {
    return errorGate;
  }

  const isEmpty = !isLoading && !tokens?.length && !wallets?.length;

  const toggleDetailAction = (
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={Icon.Sidebar}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => setIsShowingDetail((value) => !value)}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle={true}
      searchBarPlaceholder="Token, Address or Domain"
      isShowingDetail={isShowingDetail && Boolean(tokens?.length)}
      onSelectionChange={setSelectedId}
    >
      {query ? (
        isLoading && isEmpty ? (
          <List.EmptyView title="Looking for tokens" icon={Icon.CircleProgress} />
        ) : (
          <>
            {wallets?.length ? (
              <List.Section title="Wallets">
                {wallets.map((wallet) => (
                  <WalletLine key={wallet.address} wallet={wallet} />
                ))}
              </List.Section>
            ) : null}
            {tokens?.length ? (
              <List.Section title="Tokens">
                {tokens.map((token) => (
                  <AssetLine
                    key={token.id}
                    asset={token}
                    isShowingDetail={isShowingDetail}
                    isSelected={selectedId === `token:${token.id}`}
                    detailAction={toggleDetailAction}
                  />
                ))}
              </List.Section>
            ) : null}
          </>
        )
      ) : (
        <List.EmptyView title="Start typing token name" icon={Icon.MagnifyingGlass} />
      )}
    </List>
  );
}

export default withAccessToken(zerionOAuth)(Command);
