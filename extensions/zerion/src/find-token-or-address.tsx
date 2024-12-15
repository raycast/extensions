import { Icon, List, Image, Color, ActionPanel, Action, useNavigation } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useState } from "react";
import type { SearchAsset, SearchWallet } from "./shared/types";
import { useSearch } from "./shared/useSearch";
import { middleTruncate } from "./shared/utils";
import { AddressView } from "./components/AddressView";
import { SafeAddressActions } from "./components/AddressLine";
import { normalizeAddress } from "./shared/NormalizedAddress";

function AssetLine({ asset }: { asset: SearchAsset }) {
  return (
    <List.Item
      title={asset.name}
      icon={{ source: asset.iconUrl || Icon.Circle, mask: Image.Mask.Circle }}
      subtitle={asset.symbol}
      accessories={[
        { text: { value: `$${asset.meta.price ? Number(asset.meta.price).toFixed(2) : "0.00"}` } },
        {
          text: {
            value: `${asset.meta.relativeChange1d ? asset.meta.relativeChange1d.toFixed() : 0}%`,
            color: (asset.meta.relativeChange1d || 0) >= 0 ? Color.Green : Color.Red,
          },
        },
      ]}
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser
            url={`https://app.zerion.io/tokens/${asset.id}`}
            title="Open in Zerion Web App"
            icon={Icon.Globe}
          />
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
      title={wallet.name === normalizedAddress ? truncatedAddress : wallet.name}
      subtitle={wallet.name === normalizedAddress ? undefined : truncatedAddress}
      actions={
        <ActionPanel title="Actions">
          <Action
            onAction={() => push(<AddressView addressOrDomain={normalizedAddress} />)}
            title="Go To Wallet"
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

export default function Command(props: LaunchProps) {
  const [query, setQuery] = useState(props.arguments.query);

  const { tokens, wallets, isLoading } = useSearch(query);

  const isEmpty = !isLoading && !tokens?.length && !wallets?.length;

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle={true}
      searchBarPlaceholder="Token, Address or Domain"
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
                  <AssetLine key={token.id} asset={token} />
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
