import { Color, Icon, Image, List, environment } from "@raycast/api";
import { useMemo } from "react";
import type { ChainInfo } from "../shared/types";
import { formatPrice, formatUsd, renderTokenCard, type Change } from "../shared/performanceChart";
import { formatQuantity } from "../shared/transactionDisplay";
import { minus } from "../shared/typography";
import {
  useMarketData,
  useTokenDayChart,
  useTokenPnl,
  type MarketData,
  type TokenPnl,
} from "../shared/useTokenDetails";

/** Large amounts read better rounded: $1.23B, $45.6M, $789K */
function formatCompactUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function formatSignedPercent(percent: number) {
  const abs = Math.abs(percent);
  const digits = abs < 1 ? 2 : 1;
  return `${percent >= 0 ? "+" : minus}${abs.toFixed(digits)}%`;
}

function changeColor(value: number) {
  return value > 0 ? Color.Green : value < 0 ? Color.Red : Color.SecondaryText;
}

function signedUsd(value: number) {
  return `${value >= 0 ? "+" : minus}${formatUsd(Math.abs(value))}`;
}

function MarketSection({ marketData }: { marketData: MarketData }) {
  const rows: { title: string; text: string }[] = [
    marketData.marketCap != null ? { title: "Market Cap", text: formatCompactUsd(marketData.marketCap) } : null,
    marketData.fullyDilutedValuation != null
      ? { title: "Fully Diluted Valuation", text: formatCompactUsd(marketData.fullyDilutedValuation) }
      : null,
    marketData.volume1d != null ? { title: "24h Volume", text: formatCompactUsd(marketData.volume1d) } : null,
    marketData.circulatingSupply != null
      ? { title: "Circulating Supply", text: formatCompactNumber(marketData.circulatingSupply) }
      : null,
    marketData.totalSupply != null
      ? { title: "Total Supply", text: formatCompactNumber(marketData.totalSupply) }
      : null,
  ].filter(Boolean) as { title: string; text: string }[];
  const changes = marketData.changes.filter((change) => change.percent != null);

  return (
    <>
      {rows.map((row) => (
        <List.Item.Detail.Metadata.Label key={row.title} title={row.title} text={row.text} />
      ))}
      {changes.length ? (
        <List.Item.Detail.Metadata.TagList title="Price Change">
          {changes.map((change) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={change.label}
              text={`${change.label} ${formatSignedPercent(change.percent as number)}`}
              color={changeColor(change.percent as number)}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
    </>
  );
}

function PnlSection({ pnl, isLoading, error }: { pnl?: TokenPnl; isLoading: boolean; error?: Error }) {
  if (error) {
    return <List.Item.Detail.Metadata.Label title="PnL" text="PnL unavailable" icon={Icon.Warning} />;
  }
  if (!pnl) {
    return isLoading ? <List.Item.Detail.Metadata.Label title="PnL" text="Loading…" /> : null;
  }
  const totalGainText =
    pnl.totalGainPercent == null
      ? signedUsd(pnl.totalGain)
      : `${signedUsd(pnl.totalGain)} (${formatSignedPercent(pnl.totalGainPercent)})`;
  return (
    <>
      <List.Item.Detail.Metadata.Label
        title="Total Gain"
        text={{ value: totalGainText, color: changeColor(pnl.totalGain) }}
      />
      <List.Item.Detail.Metadata.Label
        title="Realized"
        text={{ value: signedUsd(pnl.realizedGain), color: changeColor(pnl.realizedGain) }}
      />
      <List.Item.Detail.Metadata.Label
        title="Unrealized"
        text={{ value: signedUsd(pnl.unrealizedGain), color: changeColor(pnl.unrealizedGain) }}
      />
      <List.Item.Detail.Metadata.Label title="Total Invested" text={formatUsd(pnl.totalInvested)} />
      <List.Item.Detail.Metadata.Label title="Net Invested" text={formatUsd(pnl.netInvested)} />
      {pnl.averageBuyPrice != null && pnl.averageBuyPrice > 0 ? (
        <List.Item.Detail.Metadata.Label title="Avg. Buy Price" text={formatPrice(pnl.averageBuyPrice)} />
      ) : null}
    </>
  );
}

export interface TokenDetailPosition {
  quantity: number;
  value: number | null;
  chains: ChainInfo[];
}

/**
 * Token Details: 1D price chart, Market Data, the position it was opened from
 * and (when a wallet is given) that wallet's Token PnL.
 *
 * Only the selected row should pass `isActive`; that's what gates the requests.
 */
export function TokenDetail({
  token,
  isActive,
  position,
  wallet,
}: {
  token: {
    id: string;
    symbol: string;
    price: number | null;
    relativeChange1d: number | null;
    implementations?: { chainId: string; address: string }[];
  };
  isActive: boolean;
  position?: TokenDetailPosition;
  /** Present on the Wallet Overview; enables the Token PnL section */
  wallet?: { address: string; chain: string };
}) {
  const { marketData, isLoading: marketIsLoading } = useMarketData({ fungibleId: token.id, execute: isActive });
  const { chart, isLoading: chartIsLoading } = useTokenDayChart({ fungibleId: token.id, execute: isActive });
  const pnlEnabled = Boolean(wallet);
  const {
    pnl,
    isLoading: pnlIsLoading,
    error: pnlError,
  } = useTokenPnl({
    address: wallet?.address ?? "",
    fungibleId: token.id,
    implementations: token.implementations ?? [],
    chain: wallet?.chain,
    execute: isActive && pnlEnabled,
  });

  const price = marketData?.price ?? token.price;
  const relativeChange = marketData?.changes[0].percent ?? token.relativeChange1d;

  const markdown = useMemo(() => {
    const change: Change | null =
      price != null && relativeChange != null
        ? { absolute: price - price / (1 + relativeChange / 100), relative: relativeChange }
        : null;
    const image = renderTokenCard({ theme: environment.appearance, price, change, points: chart?.points });
    return `![${token.symbol}](${image})`;
  }, [price, relativeChange, chart, token.symbol]);

  return (
    <List.Item.Detail
      isLoading={marketIsLoading || chartIsLoading || pnlIsLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {marketData ? <MarketSection marketData={marketData} /> : null}
          {position ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Balance"
                text={`${formatQuantity(position.quantity)} ${token.symbol}`}
              />
              {position.value != null ? (
                <List.Item.Detail.Metadata.Label title="Value" text={formatUsd(position.value)} />
              ) : null}
              {position.chains.length ? (
                <List.Item.Detail.Metadata.TagList title={position.chains.length > 1 ? "Chains" : "Chain"}>
                  {position.chains.map((chain) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={chain.id}
                      text={chain.name}
                      icon={{ source: chain.iconUrl || Icon.ComputerChip, mask: Image.Mask.RoundedRectangle }}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </>
          ) : null}
          {pnlEnabled ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <PnlSection pnl={pnl} isLoading={pnlIsLoading} error={pnlError} />
            </>
          ) : null}
          {marketData?.links.length ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              {marketData.links.map((link, index) => (
                <List.Item.Detail.Metadata.Link
                  key={`${link.name}-${index}`}
                  title={index === 0 ? "Links" : ""}
                  text={link.name}
                  target={link.url}
                />
              ))}
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
