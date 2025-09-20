import { List, Color, Icon, Image, ActionPanel, Action } from "@raycast/api";
import capitalize from "lodash/capitalize";
import { useMemo, useState } from "react";
import type { AggregatedPosition, Position } from "../shared/types";
import {
  DEFAULT_DAPP_ID,
  getFullPositionsValue,
  getPositionBalance,
  getPositionValue,
  groupPositionsByDapp,
  groupPositionsByToken,
  sortPositionGroupsByTotalValue,
} from "../shared/utils";
import { ALL_CHAINS, ZERO_CHAIN_CONFIG } from "../shared/constants";
import { useWalletMetadata } from "../shared/useWalletMetadata";
import { ChainsSelector } from "../components/NetworkSelect";
import { AddressLine } from "../components/AddressLine";
import { useWalletPositions } from "../shared/useWalletPositions";
import { useWalletPortfolio } from "../shared/useWalletPortfolio";

function PositionsGroup({
  positions,
  protocol,
  address,
}: {
  positions: Position[];
  protocol: string;
  address: string;
}) {
  const fullValue = useMemo(() => getFullPositionsValue(positions), [positions]);
  const sortedPositions = useMemo(
    () =>
      (protocol === DEFAULT_DAPP_ID ? groupPositionsByToken(positions) : positions).sort(
        (a, b) => getPositionValue(b) - getPositionValue(a),
      ) as (Position | AggregatedPosition)[],
    [positions, protocol],
  );

  return (
    <List.Section title={capitalize(protocol)} subtitle={`$${fullValue.toFixed(2)}`}>
      {sortedPositions.map((item) => {
        const relativeChange = item.asset.price?.relativeChange24h || 0;
        const absoluteChange = Math.abs(((relativeChange / 100) * getPositionValue(item)) / (1 + relativeChange / 100));
        return (
          <List.Item
            key={item.id}
            title={item.asset.name}
            icon={{ source: item.asset.iconUrl || Icon.Circle, mask: Image.Mask.Circle }}
            subtitle={item.type !== "asset" ? item.type : undefined}
            accessories={[
              {
                icon: Icon.Coins,
                text: {
                  value: `${getPositionBalance(item).toFixed(2)} ${item.asset.symbol}`,
                },
              },
              { text: { value: `$${Number(item.value)?.toFixed(2)}` || "", color: Color.PrimaryText } },
              {
                text: {
                  value: item.value
                    ? `${relativeChange.toFixed()}% ($${Math.abs(absoluteChange || 0).toFixed(2)})`
                    : "0% ($0.00)",
                  color: !absoluteChange ? Color.SecondaryText : relativeChange > 0 ? Color.Green : Color.Red,
                },
              },
              "chains" in item && item.chains.length > 1
                ? {
                    icon: {
                      source: Icon.PieChart,
                      mask: Image.Mask.RoundedRectangle,
                    },
                    tooltip: item.chains.map(({ name }) => name).join(),
                  }
                : {
                    icon: {
                      source: item.chain.iconUrl || Icon.ComputerChip,
                      mask: Image.Mask.RoundedRectangle,
                    },
                    tooltip: item.chain.name,
                  },
            ]}
            actions={
              <ActionPanel title="Actions">
                <Action.OpenInBrowser
                  url={`https://app.zerion.io/tokens/${item.asset.id}?address=${address}`}
                  title="Open in Zerion Web App"
                  icon={Icon.Globe}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

export function AddressView({ addressOrDomain }: { addressOrDomain: string }) {
  const [chainFilter, setChainFilter] = useState(ALL_CHAINS);
  const { address, walletMetadata, isLoading } = useWalletMetadata(addressOrDomain);
  const { portfolio, isLoading: portfolioIsLoading } = useWalletPortfolio({ address });
  const { positions, isLoading: positionsAreLoading } = useWalletPositions({ address, chain: chainFilter });

  const groupedPositions = useMemo(() => {
    if (!positions) {
      return {};
    }
    return groupPositionsByDapp(positions);
  }, [positions]);

  const chains = useMemo(() => {
    if (!portfolio) {
      return [];
    }
    const ids = new Set<string>(Object.keys(portfolio.positionsChainsDistribution));
    ids.add(ZERO_CHAIN_CONFIG.id);

    return Array.from(ids)
      .sort((a, b) =>
        a === ZERO_CHAIN_CONFIG.id
          ? -1
          : b === ZERO_CHAIN_CONFIG.id
            ? 1
            : portfolio.positionsChainsDistribution[b] - portfolio.positionsChainsDistribution[a],
      )
      .map((id) => (id === ZERO_CHAIN_CONFIG.id ? ZERO_CHAIN_CONFIG : portfolio?.chains[id]));
  }, [portfolio]);

  const sortedDappFrames = useMemo(() => sortPositionGroupsByTotalValue(groupedPositions), [groupedPositions]);

  return (
    <List
      searchBarPlaceholder="Filter Tokens"
      isLoading={isLoading || positionsAreLoading || portfolioIsLoading}
      searchBarAccessory={<ChainsSelector chains={chains} onChange={setChainFilter} />}
    >
      <AddressLine address={address || ""} walletMetadata={walletMetadata} onChangeSavedStatus={() => null} />
      {sortedDappFrames.map(([protocol, positions]) =>
        positions ? (
          <PositionsGroup key={protocol} address={address || ""} positions={positions} protocol={protocol} />
        ) : null,
      )}
    </List>
  );
}
