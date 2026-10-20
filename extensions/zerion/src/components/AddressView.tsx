import { List, Color, Icon, Image, ActionPanel, Action } from "@raycast/api";
import capitalize from "lodash/capitalize";
import { useMemo, useState, type ReactNode } from "react";
import type { AggregatedPosition, ChainInfo, Position } from "../shared/types";
import {
  DEFAULT_DAPP_ID,
  getFullPositionsValue,
  getPositionBalance,
  getPositionValue,
  groupPositionsByDapp,
  groupPositionsByToken,
  sortPositionGroupsByTotalValue,
} from "../shared/utils";
import { ALL_CHAINS } from "../shared/constants";
import { useWalletIdentity } from "../shared/useWalletIdentity";
import { useChains, getChainInfo } from "../shared/useChains";
import { ChainsSelector } from "../components/NetworkSelect";
import { AddressLine } from "../components/AddressLine";
import { useWalletPositions } from "../shared/useWalletPositions";
import { useWalletPortfolio } from "../shared/useWalletPortfolio";
import { useApiErrorGate } from "./ApiKeyGate";
import { useRecentTransactions } from "../shared/useWalletTransactions";
import { TransactionItem } from "./TransactionItem";
import { HistoryView } from "./HistoryView";
import { TokenDetail } from "./TokenDetail";

function PositionsGroup({
  positions,
  protocol,
  address,
  chainFilter,
  chainsById,
  isShowingDetail,
  selectedId,
  detailAction,
}: {
  positions: Position[];
  protocol: string;
  address: string;
  chainFilter: string;
  chainsById: Record<string, ChainInfo>;
  isShowingDetail: boolean;
  selectedId: string | null;
  detailAction: ReactNode;
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
        const relativeChange = item.relativeChange24h || 0;
        const absoluteChange = Math.abs(((relativeChange / 100) * getPositionValue(item)) / (1 + relativeChange / 100));
        const chain = getChainInfo(chainsById, item.chainId);
        const chains = "chainIds" in item ? item.chainIds.map((id) => getChainInfo(chainsById, id)) : [chain];
        // Section keys repeat a token across dapps, so the row id carries the section too
        const rowId = `${protocol}:${item.id}`;
        const changeAccessory = {
          text: {
            value: item.value
              ? `${relativeChange.toFixed()}% ($${Math.abs(absoluteChange || 0).toFixed(2)})`
              : "0% ($0.00)",
            color: !absoluteChange ? Color.SecondaryText : relativeChange > 0 ? Color.Green : Color.Red,
          },
        };
        const accessories = isShowingDetail
          ? [changeAccessory]
          : [
              {
                icon: Icon.Coins,
                text: {
                  value: `${getPositionBalance(item).toFixed(2)} ${item.asset.symbol}`,
                },
              },
              { text: { value: `$${Number(item.value ?? 0).toFixed(2)}`, color: Color.PrimaryText } },
              changeAccessory,
              chains.length > 1
                ? {
                    icon: {
                      source: Icon.PieChart,
                      mask: Image.Mask.RoundedRectangle,
                    },
                    tooltip: chains.map(({ name }) => name).join(),
                  }
                : {
                    icon: {
                      source: chain.iconUrl || Icon.ComputerChip,
                      mask: Image.Mask.RoundedRectangle,
                    },
                    tooltip: chain.name,
                  },
            ];
        return (
          <List.Item
            key={rowId}
            id={rowId}
            title={item.asset.name}
            icon={{ source: item.asset.iconUrl || Icon.Circle, mask: Image.Mask.Circle }}
            subtitle={item.type !== "wallet" ? item.type : undefined}
            accessories={accessories}
            detail={
              isShowingDetail ? (
                <TokenDetail
                  token={{
                    id: item.asset.id,
                    symbol: item.asset.symbol,
                    price: item.price,
                    relativeChange1d: item.relativeChange24h,
                    implementations: item.asset.implementations,
                  }}
                  isActive={selectedId === rowId}
                  position={{ quantity: getPositionBalance(item), value: item.value, chains }}
                  wallet={{ address, chain: chainFilter }}
                />
              ) : undefined
            }
            actions={
              <ActionPanel title="Actions">
                <Action.OpenInBrowser
                  url={`https://app.zerion.io/tokens/${item.asset.id}?address=${address}`}
                  title="Open in Zerion Web App"
                  icon={Icon.Globe}
                />
                {detailAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function RecentActivity({
  address,
  chainFilter,
  chains,
  chainsById,
  isShowingDetail,
  detailAction,
}: {
  address: string;
  chainFilter: string;
  chains: ChainInfo[];
  chainsById: Record<string, ChainInfo>;
  isShowingDetail: boolean;
  detailAction: ReactNode;
}) {
  const { transactions, isLoading } = useRecentTransactions({ address, chain: chainFilter });

  if (!transactions) {
    return isLoading ? <List.Section title="Recent Activity" /> : null;
  }

  return (
    <List.Section title="Recent Activity">
      {transactions.length === 0 ? (
        <List.Item icon={Icon.Clock} title="No activity yet" keywords={["history", "activity", "transactions"]} />
      ) : (
        <>
          {transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              walletAddress={address}
              chainsById={chainsById}
              dateStyle="relative"
              isShowingDetail={isShowingDetail}
              detailAction={detailAction}
            />
          ))}
          <List.Item
            icon={Icon.List}
            title="View Full History"
            keywords={["history", "activity", "transactions"]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Full History"
                  icon={Icon.List}
                  target={<HistoryView address={address} chains={chains} initialChain={chainFilter} />}
                />
                {detailAction}
              </ActionPanel>
            }
          />
        </>
      )}
    </List.Section>
  );
}

export function AddressView({ addressOrDomain }: { addressOrDomain: string }) {
  const [chainFilter, setChainFilter] = useState(ALL_CHAINS);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  // Token Details only fetch for the selected row, so the list tracks it
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { address, identity, isLoading } = useWalletIdentity(addressOrDomain);
  const { chainsById, isLoading: chainsAreLoading, error: chainsError } = useChains();
  const { portfolio, isLoading: portfolioIsLoading, error: portfolioError } = useWalletPortfolio({ address });
  const {
    positions,
    isLoading: positionsAreLoading,
    error: positionsError,
  } = useWalletPositions({ address, chain: chainFilter });

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
    return Object.keys(portfolio.positionsChainsDistribution)
      .sort((a, b) => portfolio.positionsChainsDistribution[b] - portfolio.positionsChainsDistribution[a])
      .map((id) => getChainInfo(chainsById, id));
  }, [portfolio, chainsById]);

  const sortedDappFrames = useMemo(() => sortPositionGroupsByTotalValue(groupedPositions), [groupedPositions]);

  const errorGate = useApiErrorGate(portfolioError || positionsError || chainsError);
  if (errorGate) {
    return errorGate;
  }

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
      searchBarPlaceholder="Filter Tokens"
      isLoading={isLoading || positionsAreLoading || portfolioIsLoading || chainsAreLoading}
      isShowingDetail={isShowingDetail}
      onSelectionChange={setSelectedId}
      searchBarAccessory={<ChainsSelector chains={chains} onChange={setChainFilter} />}
    >
      <AddressLine address={address || ""} identity={identity} onChangeSavedStatus={() => null} />
      {address ? (
        <RecentActivity
          address={address}
          chainFilter={chainFilter}
          chains={chains}
          chainsById={chainsById}
          isShowingDetail={isShowingDetail}
          detailAction={toggleDetailAction}
        />
      ) : null}
      {sortedDappFrames.map(([protocol, positions]) =>
        positions ? (
          <PositionsGroup
            key={protocol}
            address={address || ""}
            positions={positions}
            protocol={protocol}
            chainFilter={chainFilter}
            chainsById={chainsById}
            isShowingDetail={isShowingDetail}
            selectedId={selectedId}
            detailAction={toggleDetailAction}
          />
        ) : null,
      )}
    </List>
  );
}
